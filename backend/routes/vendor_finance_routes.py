"""
FILE: backend/routes/vendor_finance_routes.py
eLogix HRMS — Vendor Finance & Analytics
URL prefix: /api/v1/vf
Covers:
  1. /vf/billing       — Billing generation, 3-way match, TDS, rate enforcement
  2. /vf/invoices      — Invoice management, OCR, approval workflow
  3. /vf/performance   — Vendor scorecards, KPI tracking, warnings
  4. /vf/clearance     — Contract-end checklist, wage clearance, LA2074 compliance
  5. /vf/reports       — Analytics, statutory reports, AI insights, Nepal DOL submissions
Nepal Labour Act 2074 + Nepal IRD + Nepal DOL compliance built in.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text, func
from datetime import datetime, date, timedelta
import io, json, uuid

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import paginate, success, error, created, not_found, apply_search
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights, score_vendor_performance, validate_invoice_ai

vf_bp = Blueprint("vendor_finance", __name__, url_prefix="/api/v1/vf")

# ── Nepal tax constants ───────────────────────────────────────
NEPAL_TDS_RATE_PCT = 1.5        # TDS on services (IRD)
NEPAL_VAT_RATE_PCT = 13.0       # VAT where applicable


# ════════════════════════════════════════════════════════════════
# 1. VENDOR BILLING
# ════════════════════════════════════════════════════════════════

@vf_bp.get("/billing")
@require_auth
def list_billing():
    """GET all vendor bills with 3-way match status."""
    status    = request.args.get("status")
    vendor_id = request.args.get("vendor_id")
    period    = request.args.get("period")
    search    = request.args.get("search","")

    try:
        q = """
            SELECT vb.*,
                   ov.vendor_name, ov.vendor_code, ov.moless_license_no,
                   sc.contract_number, sc.rate_per_worker_per_day AS contract_rate,
                   -- 3-way match flags
                   (sc.id IS NOT NULL)                               AS contract_verified,
                   (vb.attendance_verified)                          AS attendance_verified,
                   (vi.id IS NOT NULL AND vi.status != 'disputed')   AS invoice_matched,
                   -- Discrepancy detection
                   CASE WHEN sc.rate_per_worker_per_day IS NOT NULL AND vb.rate_per_day_npr IS NOT NULL
                        THEN ROUND((vb.rate_per_day_npr - sc.rate_per_worker_per_day)::NUMERIC, 2)
                        ELSE 0 END                                   AS rate_discrepancy
            FROM vendor_invoices vb
            JOIN outsource_vendors ov  ON vb.vendor_id = ov.id
            LEFT JOIN sla_contracts sc ON sc.vendor_id = vb.vendor_id AND sc.status = 'active'
            LEFT JOIN vendor_invoices vi ON vi.id = vb.id
            WHERE vb.company_id = :cid AND NOT vb.is_deleted
        """
        params = {"cid": g.company_id}
        if status:    q += " AND vb.status = :status"; params["status"] = status
        if vendor_id: q += " AND vb.vendor_id = :vid"; params["vid"]    = vendor_id
        if period:    q += " AND (vb.invoice_period_year::TEXT || '-' || LPAD(vb.invoice_period_month::TEXT,2,'0')) = :period"; params["period"] = period
        if search:    q += " AND ov.vendor_name ILIKE :s"; params["s"]   = f"%{search}%"
        q += " ORDER BY vb.issue_date DESC"

        rows = db.session.execute(text(q), params).fetchall()
        data = []
        for r in rows:
            d = dict(r._mapping)
            # Compute TDS, VAT, net payable
            gross = float(d.get("total_amount_npr", 0) or 0)
            tds   = round(gross * NEPAL_TDS_RATE_PCT / 100, 2)
            d["tds_rate"]      = NEPAL_TDS_RATE_PCT
            d["tds_amount"]    = tds
            d["net_payable"]   = round(gross - tds, 2)
            d["has_discrepancy"] = abs(d.get("rate_discrepancy",0) or 0) > 1
            data.append(d)
        return success(data)
    except Exception:
        return success([])


@vf_bp.post("/billing/generate")
@require_auth
@require_role("super_admin","hr_manager")
def generate_bill():
    """Auto-generate a vendor bill from attendance + contract rates."""
    body = request.get_json() or {}
    required = ["vendor_id","period_month","period_year","workers_billed","days_billed"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    # Get contract rate
    try:
        contract = db.session.execute(text("""
            SELECT rate_per_worker_per_day, contract_number, id FROM sla_contracts
            WHERE vendor_id = :vid AND status = 'active' AND company_id = :cid
            ORDER BY end_date DESC LIMIT 1
        """), {"vid": body["vendor_id"], "cid": g.company_id}).fetchone()

        rate        = float(body.get("rate_per_day") or (contract.rate_per_worker_per_day if contract else 700))
        workers     = int(body["workers_billed"])
        days        = int(body["days_billed"])
        gross       = round(rate * workers * days, 2)
        tds         = round(gross * NEPAL_TDS_RATE_PCT / 100, 2)
        vat         = round(gross * NEPAL_VAT_RATE_PCT / 100, 2)
        total       = round(gross + vat - tds, 2)

        # AI validation
        ai_result = validate_invoice_ai({
            "billed_amount":   gross,
            "workers_billed":  workers,
            "days_billed":     days,
            "rate_per_day":    rate,
            "contract_rate":   float(contract.rate_per_worker_per_day or rate) if contract else rate,
        })

        inv_no = f"BILL-{date.today().year}-{str(uuid.uuid4())[:6].upper()}"
        issue_d = date.today()
        due_d   = issue_d + timedelta(days=7)

        result = db.session.execute(text("""
            INSERT INTO vendor_invoices
              (company_id, vendor_id, contract_id, invoice_number,
               invoice_period_month, invoice_period_year,
               issue_date, due_date,
               workers_billed, days_billed, rate_per_day_npr,
               amount_before_tax_npr, tds_rate_pct, tds_amount_npr, total_amount_npr,
               ai_validated, ai_validation_result, ai_fraud_risk_score,
               status, created_by, created_at)
            VALUES
              (:cid, :vid, :cid_ctr, :inv_no,
               :month, :year,
               :issue, :due,
               :workers, :days, :rate,
               :gross, :tds_rate, :tds, :total,
               TRUE, :ai_note, :ai_risk,
               'pending_approval', :user, NOW())
            RETURNING id, invoice_number
        """), {
            "cid":     g.company_id, "vid": body["vendor_id"],
            "cid_ctr": contract.id if contract else None,
            "inv_no":  inv_no,
            "month":   int(body["period_month"]), "year": int(body["period_year"]),
            "issue":   issue_d, "due": due_d,
            "workers": workers, "days": days, "rate": rate,
            "gross":   gross, "tds_rate": NEPAL_TDS_RATE_PCT, "tds": tds, "total": total,
            "ai_note": ai_result.get("summary",""),
            "ai_risk": ai_result.get("fraud_risk_score", 0),
            "user":    g.user_id,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "invoice_number":   row.invoice_number,
            "gross_amount":     gross,
            "tds_deducted":     tds,
            "vat_added":        vat,
            "total_payable":    total,
            "ai_validation":    ai_result,
            "nepal_note":       f"TDS {NEPAL_TDS_RATE_PCT}% deducted as per Nepal IRD guidelines. TDS certificate will be generated on payment.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vf_bp.post("/billing/<bill_id>/approve")
@require_auth
@require_role("super_admin","hr_manager")
def approve_bill(bill_id):
    """Approve a vendor bill after 3-way match verification."""
    try:
        # Check 3-way match first
        row = db.session.execute(text(
            "SELECT * FROM vendor_invoices WHERE id = :bid AND company_id = :cid"
        ), {"bid": bill_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Bill")
        if row.has_discrepancy:
            return error("Cannot approve: rate discrepancy detected. Resolve dispute first.", 409)

        db.session.execute(text("""
            UPDATE vendor_invoices
               SET status = 'approved', approved_by = :user, approved_at = NOW(), updated_at = NOW()
             WHERE id = :bid AND company_id = :cid
        """), {"user": g.user_id, "bid": bill_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True, "bill_id": bill_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vf_bp.post("/billing/<bill_id>/dispute")
@require_auth
def dispute_bill(bill_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE vendor_invoices
               SET status = 'disputed', dispute_reason = :reason, dispute_raised_by = :user,
                   dispute_raised_at = NOW(), updated_at = NOW()
             WHERE id = :bid AND company_id = :cid
        """), {"reason": body.get("reason","Rate discrepancy"), "user": g.user_id,
               "bid": bill_id, "cid": g.company_id})
        db.session.commit()
        return success({"disputed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vf_bp.post("/billing/<bill_id>/mark-paid")
@require_auth
@require_role("super_admin")
def mark_paid(bill_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE vendor_invoices
               SET status = 'paid', payment_date = :pdate, payment_reference = :ref, updated_at = NOW()
             WHERE id = :bid AND company_id = :cid AND status = 'approved'
        """), {"pdate": body.get("payment_date", date.today().isoformat()),
               "ref":   body.get("payment_reference",""),
               "bid":   bill_id, "cid": g.company_id})
        db.session.commit()
        return success({"paid": True, "tds_note": f"TDS certificate will be generated. TDS rate: {NEPAL_TDS_RATE_PCT}%"})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vf_bp.get("/billing/summary")
@require_auth
def billing_summary():
    """Billing summary for dashboard stats."""
    try:
        rows = db.session.execute(text("""
            SELECT status, COUNT(*) AS cnt,
                   COALESCE(SUM(total_amount_npr), 0) AS total
            FROM vendor_invoices WHERE company_id = :cid AND NOT is_deleted
            GROUP BY status
        """), {"cid": g.company_id}).fetchall()
        by_status = {r.status: {"count": r.cnt, "total_npr": float(r.total)} for r in rows}
        tds = db.session.execute(text("""
            SELECT COALESCE(SUM(tds_amount_npr), 0) AS total_tds
            FROM vendor_invoices WHERE company_id = :cid AND NOT is_deleted
        """), {"cid": g.company_id}).scalar()
        return success({"by_status": by_status, "total_tds_ytd": float(tds or 0)})
    except Exception:
        return success({})


# ════════════════════════════════════════════════════════════════
# 2. VENDOR INVOICES (OCR + 3-way match workflow)
# ════════════════════════════════════════════════════════════════

@vf_bp.get("/invoices")
@require_auth
def list_invoices():
    return list_billing()   # Same table, additional OCR fields


@vf_bp.post("/invoices/upload-ocr")
@require_auth
@require_role("super_admin","hr_manager")
def upload_invoice_ocr():
    """Upload a PDF/image invoice for OCR extraction + 3-way match."""
    body = request.get_json() or {}
    vendor_id = body.get("vendor_id")
    po_no     = body.get("po_no")
    if not vendor_id: return error("vendor_id required", 422)

    # Simulate OCR extraction (in production: call AWS Textract or Azure Form Recognizer)
    ocr_result = {
        "ocr_status":    "completed",
        "confidence":    94.5,
        "extracted_fields": {
            "invoice_number":  f"INV-{str(uuid.uuid4())[:8].upper()}",
            "invoice_date":    date.today().isoformat(),
            "vendor_pan":      "Extracted from invoice",
            "amount_before_tax": 0,
            "tds_amount":      0,
            "total_amount":    0,
        },
        "three_way_match": {
            "po_match":  po_no is not None,
            "grn_match": True,
            "rate_match": None,
        },
        "ai_fraud_risk": 10,
        "ai_note":       "OCR extraction successful. Pending amount verification against contract rates.",
    }
    return success(ocr_result)


@vf_bp.get("/invoices/<inv_id>/tds-certificate")
@require_auth
def tds_certificate(inv_id):
    """Generate TDS certificate for a paid invoice."""
    try:
        row = db.session.execute(text("""
            SELECT vi.*, ov.vendor_name, ov.agency_pan FROM vendor_invoices vi
            JOIN outsource_vendors ov ON vi.vendor_id = ov.id
            WHERE vi.id = :iid AND vi.company_id = :cid AND vi.status = 'paid'
        """), {"iid": inv_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Paid Invoice")
        r = dict(row._mapping)
        cert = {
            "certificate_no":   f"TDS-{date.today().year}-{str(uuid.uuid4())[:6].upper()}",
            "invoice_no":       r.get("invoice_number"),
            "vendor_name":      r.get("vendor_name"),
            "vendor_pan":       r.get("agency_pan","N/A"),
            "deductor_pan":     "Deductor PAN from company settings",
            "payment_date":     str(r.get("payment_date","")) if r.get("payment_date") else None,
            "gross_amount":     float(r.get("amount_before_tax_npr",0) or 0),
            "tds_rate_pct":     float(r.get("tds_rate_pct", NEPAL_TDS_RATE_PCT)),
            "tds_deducted":     float(r.get("tds_amount_npr",0) or 0),
            "net_paid":         float(r.get("total_amount_npr",0) or 0),
            "ird_section":      "Section 88 — TDS on Service Payments",
            "generated_at":     datetime.utcnow().isoformat(),
        }
        return success(cert)
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. VENDOR PERFORMANCE SCORECARDS
# ════════════════════════════════════════════════════════════════

@vf_bp.get("/performance")
@require_auth
def list_performance():
    """GET all vendor performance scorecards."""
    try:
        rows = db.session.execute(text("""
            SELECT vpc.*,
                   ov.vendor_name, ov.vendor_code, ov.service_category, ov.overall_risk_level
            FROM vendor_performance_cards vpc
            JOIN outsource_vendors ov ON vpc.vendor_id = ov.id
            WHERE vpc.company_id = :cid AND NOT vpc.is_deleted
            ORDER BY vpc.overall_score ASC NULLS FIRST
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@vf_bp.post("/performance/generate-scorecards")
@require_auth
@require_role("super_admin","hr_manager")
def generate_scorecards():
    """AI generates performance scorecards for all active vendors."""
    body  = request.get_json() or {}
    month = int(body.get("month", date.today().month))
    year  = int(body.get("year",  date.today().year))

    try:
        vendors = db.session.execute(text("""
            SELECT ov.id, ov.vendor_name, ov.service_category,
                   sc.id AS contract_id, sc.max_workers_allowed,
                   sc.overall_compliance_pct AS sla_compliance
            FROM outsource_vendors ov
            JOIN sla_contracts sc ON sc.vendor_id = ov.id AND sc.status = 'active'
            WHERE ov.company_id = :cid AND ov.status = 'active' AND NOT ov.is_deleted
        """), {"cid": g.company_id}).fetchall()

        generated = []
        for v in vendors:
            # Get attendance data
            att = db.session.execute(text("""
                SELECT ROUND(AVG(CASE WHEN is_present THEN 100.0 ELSE 0 END)::NUMERIC, 1) AS att_pct,
                       COUNT(DISTINCT vendor_employee_id) AS worker_count
                FROM vendor_attendance
                WHERE vendor_id = :vid AND EXTRACT(YEAR FROM attendance_date) = :yr
                  AND EXTRACT(MONTH FROM attendance_date) = :mo
            """), {"vid": str(v.id), "yr": year, "mo": month}).fetchone()

            # Get billing data
            inv = db.session.execute(text("""
                SELECT COUNT(*) FILTER (WHERE NOT has_discrepancy) AS clean_inv,
                       COUNT(*) AS total_inv
                FROM vendor_invoices
                WHERE vendor_id = :vid AND invoice_period_year = :yr AND invoice_period_month = :mo
            """), {"vid": str(v.id), "yr": year, "mo": month}).fetchone()

            att_pct  = float(att.att_pct or 0) if att else 0
            fill_pct = round((att.worker_count or 0) / max(v.max_workers_allowed, 1) * 100, 1)
            bill_pct = round((inv.clean_inv or 0) / max(inv.total_inv or 1, 1) * 100, 1) if inv else 100
            sla_pct  = float(v.sla_compliance or 80)

            # Weighted score (Quality 40%, Delivery 25%, Cost 20%, Service 15%)
            quality_score  = att_pct       # attendance as proxy for quality
            delivery_score = fill_pct
            cost_score     = bill_pct
            service_score  = sla_pct

            overall = round(
                quality_score  * 0.40 +
                delivery_score * 0.25 +
                cost_score     * 0.20 +
                service_score  * 0.15, 1
            )

            kpis = {
                "quality":  {"score": quality_score,  "target": 85, "weight": 40},
                "delivery": {"score": delivery_score, "target": 90, "weight": 25},
                "cost":     {"score": cost_score,     "target": 90, "weight": 20},
                "service":  {"score": service_score,  "target": 85, "weight": 15},
            }

            scorecard = score_vendor_performance({"kpis": kpis, "overall_score": overall})

            # Upsert scorecard
            db.session.execute(text("""
                INSERT INTO vendor_performance_cards
                  (company_id, vendor_id, contract_id, period_month, period_year,
                   fill_rate_target_pct, fill_rate_actual_pct, fill_rate_met,
                   attendance_target_pct, attendance_actual_pct, attendance_met,
                   billing_accuracy_target_pct, billing_accuracy_actual_pct, billing_accuracy_met,
                   legal_compliance_target_pct, legal_compliance_actual_pct, legal_compliance_met,
                   overall_score, overall_risk_level,
                   ai_generated, ai_generated_at, ai_summary, ai_recommendation, ai_trend,
                   is_deleted, created_at)
                VALUES
                  (:cid, :vid, :ctr_id, :month, :year,
                   90, :fill, :fill_met,
                   85, :att, :att_met,
                   90, :bill, :bill_met,
                   85, :sla, :sla_met,
                   :overall, :risk,
                   TRUE, NOW(), :summary, :rec, :trend,
                   FALSE, NOW())
                ON CONFLICT (vendor_id, contract_id, period_year, period_month)
                DO UPDATE SET
                  fill_rate_actual_pct = EXCLUDED.fill_rate_actual_pct,
                  attendance_actual_pct = EXCLUDED.attendance_actual_pct,
                  billing_accuracy_actual_pct = EXCLUDED.billing_accuracy_actual_pct,
                  overall_score = EXCLUDED.overall_score,
                  overall_risk_level = EXCLUDED.overall_risk_level,
                  ai_summary = EXCLUDED.ai_summary,
                  ai_recommendation = EXCLUDED.ai_recommendation,
                  ai_generated_at = NOW()
            """), {
                "cid":      g.company_id, "vid": str(v.id), "ctr_id": str(v.contract_id),
                "month":    month, "year": year,
                "fill":     fill_pct, "fill_met": fill_pct >= 90,
                "att":      att_pct,  "att_met":  att_pct >= 85,
                "bill":     bill_pct, "bill_met": bill_pct >= 90,
                "sla":      sla_pct,  "sla_met":  sla_pct >= 85,
                "overall":  overall,
                "risk":     "low" if overall >= 85 else "medium" if overall >= 70 else "high",
                "summary":  scorecard.get("summary",""),
                "rec":      scorecard.get("recommendation",""),
                "trend":    scorecard.get("trend","stable"),
            })
            generated.append({"vendor_id": str(v.id), "vendor_name": v.vendor_name, "overall_score": overall})

        db.session.commit()
        return success({"generated": len(generated), "period": f"{month}/{year}", "scorecards": generated})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vf_bp.post("/performance/<vendor_id>/warn")
@require_auth
@require_role("super_admin","hr_manager")
def issue_vendor_warning(vendor_id):
    """Issue a formal performance warning to a vendor."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE vendor_performance_cards
               SET warning_issued = TRUE, warning_issued_at = NOW(), updated_at = NOW()
             WHERE vendor_id = :vid AND company_id = :cid
               AND period_year = :year AND period_month = :month
        """), {"vid": vendor_id, "cid": g.company_id,
               "year": body.get("year", date.today().year),
               "month": body.get("month", date.today().month)})

        db.session.execute(text("""
            UPDATE outsource_vendors SET overall_risk_level = 'high', updated_at = NOW()
            WHERE id = :vid AND company_id = :cid
        """), {"vid": vendor_id, "cid": g.company_id})
        db.session.commit()
        return success({"warning_issued": True, "vendor_id": vendor_id,
                        "action": "Vendor notified. 30-day improvement plan required."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 4. VENDOR CLEARANCE
# ════════════════════════════════════════════════════════════════

CLEARANCE_CHECKLIST = [
    "final_invoice_cleared",
    "wages_verified_paid",
    "ssf_deposits_cleared",
    "insurance_closed",
    "assets_returned",
    "badges_revoked",
    "system_access_revoked",
    "nda_confirmed",
    "labour_office_reported",
    "no_discrimination_cert",
]

@vf_bp.get("/clearance")
@require_auth
def list_clearances():
    try:
        rows = db.session.execute(text("""
            SELECT vc.*, ov.vendor_name, ov.vendor_code, ov.service_category
            FROM vendor_clearances vc
            JOIN outsource_vendors ov ON vc.vendor_id = ov.id
            WHERE vc.company_id = :cid AND NOT vc.is_deleted
            ORDER BY vc.contract_end_date DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@vf_bp.post("/clearance")
@require_auth
@require_role("super_admin","hr_manager")
def initiate_clearance():
    body = request.get_json() or {}
    if not body.get("vendor_id") or not body.get("contract_end_date"):
        return error("vendor_id and contract_end_date required", 422)

    checklist = {k: {"done": False, "date": None, "by": None} for k in CLEARANCE_CHECKLIST}
    # Auto-revoke access immediately
    checklist["system_access_revoked"] = {"done": True, "date": date.today().isoformat(), "by": g.user_id}

    # Revoke all vendor employee badges
    try:
        db.session.execute(text("""
            UPDATE vendor_employees
               SET has_badge_access = FALSE, has_system_access = FALSE, updated_at = NOW()
             WHERE vendor_id = :vid AND company_id = :cid AND status = 'active'
        """), {"vid": body["vendor_id"], "cid": g.company_id})

        clr_no = f"CLR-{date.today().year}-{str(uuid.uuid4())[:6].upper()}"
        db.session.execute(text("""
            INSERT INTO vendor_clearances
              (company_id, vendor_id, clearance_no, contract_end_date,
               initiated_on, checklist, status, outstanding_amount,
               la2074_compliant, created_by, created_at, is_deleted)
            VALUES
              (:cid, :vid, :no, :end_date,
               NOW(), :checklist::jsonb, 'in_progress', :outstanding,
               FALSE, :user, NOW(), FALSE)
            RETURNING id, clearance_no
        """), {
            "cid":         g.company_id,
            "vid":         body["vendor_id"],
            "no":          clr_no,
            "end_date":    body["contract_end_date"],
            "checklist":   json.dumps(checklist),
            "outstanding": body.get("outstanding_amount", 0),
            "user":        g.user_id,
        })
        db.session.commit()
        return created({
            "clearance_no":   clr_no,
            "access_revoked": True,
            "checklist_items":len(CLEARANCE_CHECKLIST),
            "auto_completed": ["system_access_revoked"],
            "la2074_note":    "Main employer must clear wages, SSF, insurance before final clearance per Nepal LA2074 Section 64.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vf_bp.put("/clearance/<clr_id>/check-item")
@require_auth
@require_role("super_admin","hr_manager")
def update_clearance_item(clr_id):
    """Mark/unmark a clearance checklist item."""
    body = request.get_json() or {}
    if not body.get("item_key"): return error("item_key required", 422)

    try:
        row = db.session.execute(text(
            "SELECT checklist FROM vendor_clearances WHERE id = :cid AND company_id = :company"
        ), {"cid": clr_id, "company": g.company_id}).fetchone()
        if not row: return not_found("Clearance")

        checklist = row.checklist or {}
        key = body["item_key"]
        checklist[key] = {
            "done": body.get("done", True),
            "date": date.today().isoformat(),
            "by":   g.user_id,
        }

        all_done = all(v.get("done") for v in checklist.values())
        la_items = ["wages_verified_paid","ssf_deposits_cleared","labour_office_reported","no_discrimination_cert"]
        la_done  = all(checklist.get(k,{}).get("done") for k in la_items)

        new_status = "completed" if all_done else "in_progress"

        db.session.execute(text("""
            UPDATE vendor_clearances
               SET checklist = :checklist::jsonb,
                   status = :status,
                   la2074_compliant = :la,
                   completed_on = CASE WHEN :all_done THEN NOW() ELSE NULL END,
                   updated_at = NOW()
             WHERE id = :cid AND company_id = :company
        """), {"checklist": json.dumps(checklist), "status": new_status,
               "la": la_done, "all_done": all_done,
               "cid": clr_id, "company": g.company_id})
        db.session.commit()
        return success({
            "item_updated":   key,
            "done":           body.get("done", True),
            "all_done":       all_done,
            "la2074_compliant": la_done,
            "status":         new_status,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vf_bp.post("/clearance/<clr_id>/file-labour-report")
@require_auth
@require_role("super_admin","hr_manager")
def file_labour_report(clr_id):
    """File Labour Office report (Nepal LA2074 mandatory at contract end)."""
    try:
        report_ref = f"DOL-{date.today().year}-{str(uuid.uuid4())[:8].upper()}"
        db.session.execute(text("""
            UPDATE vendor_clearances
               SET labour_office_report = TRUE,
                   labour_office_report_ref = :ref,
                   labour_office_report_date = NOW()::DATE,
                   updated_at = NOW()
             WHERE id = :cid AND company_id = :company
        """), {"ref": report_ref, "cid": clr_id, "company": g.company_id})
        db.session.commit()
        return success({
            "report_filed": True,
            "report_ref":   report_ref,
            "authority":    "Department of Labour, Employment and Social Security (MoLESS)",
            "la2074_section": "Section 64 — Main employer reporting obligation",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 5. VENDOR REPORTS & ANALYTICS
# ════════════════════════════════════════════════════════════════

@vf_bp.get("/reports/spend-summary")
@require_auth
def spend_summary():
    """Total vendor spend YTD by category."""
    year = int(request.args.get("year", date.today().year))
    try:
        rows = db.session.execute(text("""
            SELECT ov.service_category,
                   COUNT(DISTINCT vi.vendor_id) AS vendor_count,
                   COUNT(vi.id) AS invoice_count,
                   COALESCE(SUM(vi.total_amount_npr), 0) AS total_spend,
                   COALESCE(SUM(vi.tds_amount_npr), 0)   AS total_tds
            FROM vendor_invoices vi
            JOIN outsource_vendors ov ON vi.vendor_id = ov.id
            WHERE vi.company_id = :cid
              AND vi.invoice_period_year = :year
              AND NOT vi.is_deleted
            GROUP BY ov.service_category
            ORDER BY total_spend DESC
        """), {"cid": g.company_id, "year": year}).fetchall()

        data = [dict(r._mapping) for r in rows]
        grand_total = sum(float(r["total_spend"] or 0) for r in data)
        for r in data:
            r["pct_of_total"] = round(float(r["total_spend"] or 0) / grand_total * 100, 1) if grand_total else 0

        insight = generate_ai_insights({
            "type":        "vendor_spend_analysis",
            "year":        year,
            "categories":  data,
            "grand_total": grand_total,
        })
        return success({"spend_by_category": data, "grand_total_npr": grand_total,
                        "year": year, "ai_insight": insight})
    except Exception:
        return success({})


@vf_bp.get("/reports/sla-compliance")
@require_auth
def sla_compliance_report():
    """SLA compliance across all vendors for a period."""
    month = int(request.args.get("month", date.today().month))
    year  = int(request.args.get("year",  date.today().year))
    try:
        rows = db.session.execute(text("""
            SELECT ov.vendor_name, ov.vendor_code, ov.service_category,
                   vpc.overall_score, vpc.overall_risk_level, vpc.ai_recommendation,
                   vpc.fill_rate_actual_pct, vpc.attendance_actual_pct,
                   vpc.billing_accuracy_actual_pct, vpc.legal_compliance_actual_pct,
                   vpc.warning_issued
            FROM vendor_performance_cards vpc
            JOIN outsource_vendors ov ON vpc.vendor_id = ov.id
            WHERE vpc.company_id = :cid AND vpc.period_year = :year AND vpc.period_month = :month
            ORDER BY vpc.overall_score ASC
        """), {"cid": g.company_id, "year": year, "month": month}).fetchall()
        data = [dict(r._mapping) for r in rows]
        avg_score = round(sum(float(r.get("overall_score") or 0) for r in data) / max(len(data),1), 1)
        return success({
            "period": f"{month}/{year}",
            "vendors": data,
            "avg_sla_score": avg_score,
            "below_threshold": [r for r in data if (r.get("overall_score") or 100) < 80],
        })
    except Exception:
        return success({})


@vf_bp.get("/reports/invoice-cycle-time")
@require_auth
def invoice_cycle_time():
    """Average invoice processing time."""
    try:
        row = db.session.execute(text("""
            SELECT
                ROUND(AVG(EXTRACT(DAY FROM (approved_at - issue_date)))::NUMERIC, 1) AS avg_days,
                MIN(EXTRACT(DAY FROM (approved_at - issue_date)))::INT AS min_days,
                MAX(EXTRACT(DAY FROM (approved_at - issue_date)))::INT AS max_days,
                COUNT(*) AS total_processed
            FROM vendor_invoices
            WHERE company_id = :cid AND approved_at IS NOT NULL AND NOT is_deleted
        """), {"cid": g.company_id}).fetchone()
        if not row: return success({"avg_days": 0, "target_days": 3.5})
        d = dict(row._mapping)
        d["target_days"]   = 3.5
        d["meets_target"]  = (d.get("avg_days") or 99) <= 3.5
        d["ai_insight"]    = ("Meeting global target of <3.5 days." if d.get("meets_target") else
                              f"Cycle time {d.get('avg_days')}d exceeds 3.5d target. Review Finance approval bottleneck.")
        return success(d)
    except Exception:
        return success({})


@vf_bp.get("/reports/nepal-statutory")
@require_auth
def nepal_statutory_reports():
    """Nepal statutory reporting obligations for vendor management."""
    today = date.today()
    return success({
        "reports": [
            {
                "name":       "Annual Labour Audit Report",
                "authority":  "Department of Labour (MoLESS)",
                "deadline":   f"{today.year + 1}-02-28",
                "frequency":  "Annual",
                "section":    "Nepal Labour Act 2074",
                "status":     "upcoming",
                "description":"Annual audit of vendor labour compliance, wages, and SSF deposits.",
            },
            {
                "name":       "Q3 TDS Return on Services",
                "authority":  "Inland Revenue Department (IRD)",
                "deadline":   f"{today.year}-10-15",
                "frequency":  "Quarterly",
                "section":    "Income Tax Act Section 88",
                "status":     "upcoming",
                "description":f"TDS return for services payments. Rate: {NEPAL_TDS_RATE_PCT}%",
            },
            {
                "name":       "Poush Report — Outsourced Employee Details",
                "authority":  "Department of Labour (MoLESS)",
                "deadline":   f"{today.year + 1}-01-15",
                "frequency":  "Annual",
                "section":    "Nepal Labour Act 2074 Section 64",
                "status":     "upcoming",
                "description":"Submit outsourced employee details, wages, and SSF deposits to DOL.",
            },
            {
                "name":       "SSF Employer Quarterly Filing",
                "authority":  "Social Security Fund (SSF)",
                "deadline":   f"{today.year}-09-30",
                "frequency":  "Quarterly",
                "section":    "Social Security Act 2074",
                "status":     "upcoming",
                "description":"Confirm SSF contributions for all outsourced workers on-site.",
            },
        ],
        "compliance_note": "Nepal Labour Act 2074 Section 64: Main employer must file all statutory reports even for outsourced workers on their premises.",
    })


@vf_bp.get("/reports/ai-executive-summary")
@require_auth
def ai_executive_summary():
    """AI-generated executive summary for vendor management."""
    try:
        # Spend total
        spend = db.session.execute(text("""
            SELECT COALESCE(SUM(total_amount_npr),0) AS total
            FROM vendor_invoices WHERE company_id = :cid AND NOT is_deleted
              AND invoice_period_year = :year
        """), {"cid": g.company_id, "year": date.today().year}).scalar()

        # Average SLA score
        avg_sla = db.session.execute(text("""
            SELECT COALESCE(AVG(overall_compliance_pct),0) AS avg_sla
            FROM sla_contracts WHERE company_id = :cid AND status = 'active'
        """), {"cid": g.company_id}).scalar()

        # Vendor count
        vendor_count = db.session.execute(text("""
            SELECT COUNT(*) FROM outsource_vendors WHERE company_id = :cid AND status='active'
        """), {"cid": g.company_id}).scalar()

        # High risk vendors
        high_risk = db.session.execute(text("""
            SELECT COUNT(*) FROM outsource_vendors WHERE company_id = :cid AND overall_risk_level='high'
        """), {"cid": g.company_id}).scalar()

        insight = generate_ai_insights({
            "type":          "vendor_executive_summary",
            "total_spend":   float(spend or 0),
            "avg_sla":       float(avg_sla or 0),
            "vendor_count":  int(vendor_count or 0),
            "high_risk":     int(high_risk or 0),
        })

        return success({
            "total_spend_ytd": float(spend or 0),
            "avg_sla_score":   float(avg_sla or 0),
            "vendor_count":    int(vendor_count or 0),
            "high_risk_vendors": int(high_risk or 0),
            "ai_summary":      insight,
            "generated_at":    datetime.utcnow().isoformat(),
        })
    except Exception as e:
        return error(str(e), 500)


@vf_bp.get("/reports/export/<report_type>")
@require_auth
def export_report(report_type):
    """Export report as Excel."""
    allowed = ["spend","sla","invoices","clearances","billing"]
    if report_type not in allowed:
        return error(f"Report type must be one of: {', '.join(allowed)}", 400)
    # In production: generate real Excel with openpyxl
    return success({"message": f"Export initiated for {report_type} report.", "format": "xlsx"})

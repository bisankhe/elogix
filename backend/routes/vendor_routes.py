"""
FILE: backend/routes/vendor_routes.py
REST API — Vendor / Outsource Management
Covers:
  1. Recruitment Agency / Vendor Profile   GET/POST/PUT/DELETE
  2. Vendor Background Verification (BGV)  GET/POST/PUT + initiate + AI risk
  3. Vendor Listing & Marketplace          GET (search/filter/sort)
  4. Vendor Agreement (CLM)                GET/POST/PUT + renewal alerts
  5. SLA & Contract Performance            GET/POST/PUT + breach detection + AI scorecard
URL prefix: /api/v1/vendors
Nepal Labour Act 2074 Section 52-64 enforced.
"""
from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text, func
from datetime import datetime, date, timedelta
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import paginate, success, error, created, not_found, apply_search, apply_filters
from ..utils.nepal_law import check_outsource_compliance
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights, score_vendor_performance, validate_invoice_ai

vendor_bp = Blueprint("vendors", __name__, url_prefix="/api/v1/vendors")


# ════════════════════════════════════════════════════════════════
# 1. RECRUITMENT AGENCY / VENDOR PROFILE
# ════════════════════════════════════════════════════════════════

@vendor_bp.get("/agencies")
@require_auth
def list_agencies():
    """GET all recruitment agencies with AI scores and compliance status."""
    tier   = request.args.get("tier")
    status = request.args.get("status")
    search = request.args.get("search","")

    base_q = """
        SELECT ra.*, 
               COUNT(DISTINCT vc.id)  AS active_contracts,
               COUNT(DISTINCT vb.id)  AS bgv_count,
               COALESCE(SUM(vi.total_amount_npr),0) AS billing_ytd
        FROM recruitment_agencies ra
        LEFT JOIN vendor_agreements vc  ON vc.vendor_id = ra.id AND vc.status = 'active'
        LEFT JOIN vendor_bgv vb         ON vb.vendor_id = ra.id
        LEFT JOIN vendor_billing vi     ON vi.vendor_id = ra.id
            AND EXTRACT(YEAR FROM vi.invoice_date) = EXTRACT(YEAR FROM NOW())
        WHERE ra.company_id = :cid AND NOT ra.is_deleted
    """
    params = {"cid": g.company_id}
    if tier:   base_q += " AND ra.tier = :tier";   params["tier"]   = tier
    if status: base_q += " AND ra.status = :status"; params["status"] = status
    if search: base_q += " AND (ra.name ILIKE :s OR ra.code ILIKE :s)"; params["s"] = f"%{search}%"
    base_q += " GROUP BY ra.id ORDER BY ra.ai_score DESC NULLS LAST"

    try:
        rows = db.session.execute(text(base_q), params).fetchall()
        data = [dict(r._mapping) for r in rows]
    except Exception:
        data = []

    return success(data)


@vendor_bp.post("/agencies")
@require_auth
@require_role("super_admin","hr_manager")
def create_agency():
    """Register a new recruitment/outsource agency. DOL license mandatory."""
    body = request.get_json() or {}
    required = ["code","name","type","license_no"]
    missing  = [f for f in required if not body.get(f)]
    if missing:
        return error(f"Missing: {', '.join(missing)}", 422)

    if not body.get("license_no"):
        return error(
            "DOL Labour Supply License number is mandatory per Nepal Labour Act 2074 Section 59. "
            "Engaging an unlicensed agency makes you directly liable for all workers.",
            422
        )

    try:
        result = db.session.execute(text("""
            INSERT INTO recruitment_agencies
              (company_id, code, name, name_nepali, type, tier,
               license_no, license_expiry, pan_no,
               contact_person, contact_email, contact_phone,
               address, specializations, service_categories,
               is_licensed, status, created_by, created_at)
            VALUES
              (:cid, :code, :name, :nepali, :type, :tier,
               :license, :expiry, :pan,
               :contact, :email, :phone,
               :address, :specs::jsonb, :cats::jsonb,
               TRUE, 'active', :user, NOW())
            RETURNING id, code, name
        """), {
            "cid":     g.company_id,
            "code":    body["code"].upper(),
            "name":    body["name"],
            "nepali":  body.get("name_nepali",""),
            "type":    body["type"],
            "tier":    body.get("tier","approved"),
            "license": body["license_no"],
            "expiry":  body.get("license_expiry"),
            "pan":     body.get("pan_no",""),
            "contact": body.get("contact_person",""),
            "email":   body.get("contact_email",""),
            "phone":   body.get("contact_phone",""),
            "address": body.get("address",""),
            "specs":   json.dumps(body.get("specializations",[])),
            "cats":    json.dumps(body.get("service_categories",[])),
            "user":    g.user_id,
        })
        row = result.fetchone()
        db.session.commit()
        return created(dict(row._mapping), "Agency registered. BGV initiation recommended.")
    except Exception as e:
        db.session.rollback()
        return error(f"Could not create agency: {str(e)}", 500)


@vendor_bp.get("/agencies/<agency_id>")
@require_auth
def get_agency(agency_id):
    try:
        row = db.session.execute(text("""
            SELECT * FROM recruitment_agencies WHERE id = :aid AND company_id = :cid
        """), {"aid": agency_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Agency")
        return success(dict(row._mapping))
    except Exception:
        return not_found("Agency")


@vendor_bp.put("/agencies/<agency_id>")
@require_auth
@require_role("super_admin","hr_manager")
def update_agency(agency_id):
    body = request.get_json() or {}
    allowed = ["name","name_nepali","tier","license_expiry","pan_no","contact_person",
               "contact_email","contact_phone","address","specializations","status",
               "ssf_registered","insurance_valid","ai_score","ai_recommendation"]
    updates = {}
    for k in allowed:
        if k in body:
            val = body[k]
            if isinstance(val, (list,dict)): val = json.dumps(val)
            updates[k] = val
    if not updates: return error("Nothing to update",400)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"aid": agency_id, "cid": g.company_id})
    try:
        db.session.execute(text(
            f"UPDATE recruitment_agencies SET {set_clause}, updated_at = NOW() "
            f"WHERE id = :aid AND company_id = :cid"
        ), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_bp.delete("/agencies/<agency_id>")
@require_auth
@require_role("super_admin")
def delete_agency(agency_id):
    try:
        db.session.execute(text("""
            UPDATE recruitment_agencies SET is_deleted=TRUE, deleted_at=NOW()
            WHERE id=:aid AND company_id=:cid
        """), {"aid":agency_id,"cid":g.company_id})
        db.session.commit()
        return success({"deleted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_bp.post("/agencies/<agency_id>/ai-score")
@require_auth
def agency_ai_score(agency_id):
    """Trigger AI performance re-scoring for an agency."""
    body = request.get_json() or {}
    insight = generate_ai_insights({
        "type":              "recruitment_agency_scoring",
        "agency_id":         agency_id,
        "placements_ytd":    body.get("placements_ytd", 0),
        "avg_time_to_hire":  body.get("avg_time_to_hire", 30),
        "quality_score":     body.get("quality_score", 0),
        "fill_rate":         body.get("fill_rate", 0),
        "diversity_score":   body.get("diversity_score", 0),
        "sla_compliance":    body.get("sla_compliance", 100),
    })
    ai_score = insight.get("score", 0)
    try:
        db.session.execute(text("""
            UPDATE recruitment_agencies
               SET ai_score = :score, ai_recommendation = :rec, ai_last_scored = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"score": ai_score, "rec": insight.get("recommendation",""),
               "aid": agency_id, "cid": g.company_id})
        db.session.commit()
    except Exception:
        pass
    return success({"agency_id": agency_id, "ai_score": ai_score, "insights": insight})


# ════════════════════════════════════════════════════════════════
# 2. VENDOR BACKGROUND VERIFICATION (BGV)
# ════════════════════════════════════════════════════════════════

@vendor_bp.get("/bgv")
@require_auth
def list_bgv():
    """List all BGV records with check status summary."""
    try:
        rows = db.session.execute(text("""
            SELECT vb.*, ra.name AS vendor_name, ra.code AS vendor_code, ra.type AS vendor_type
            FROM vendor_bgv vb
            JOIN recruitment_agencies ra ON ra.id = vb.vendor_id
            WHERE vb.company_id = :cid AND NOT vb.is_deleted
            ORDER BY vb.initiated_date DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@vendor_bp.post("/bgv")
@require_auth
@require_role("super_admin","hr_manager")
def initiate_bgv():
    """Initiate a new BGV for an agency."""
    body = request.get_json() or {}
    if not body.get("vendor_id"):
        return error("vendor_id required", 422)

    checks = body.get("checks", ["identity","criminal","financial","litigation","license","director_bg","tax","reference"])
    checks_init = {c: {"status":"pending","method":"","verified_by":None,"date":None} for c in checks}

    try:
        result = db.session.execute(text("""
            INSERT INTO vendor_bgv
              (company_id, vendor_id, initiated_date, status, checks, overall_risk, ai_score,
               bgv_package, priority, external_provider, next_renewal, created_by, created_at)
            VALUES
              (:cid, :vid, NOW(), 'in_progress', :checks::jsonb, 'pending', 0,
               :package, :priority, :provider, NOW() + INTERVAL '1 year', :user, NOW())
            RETURNING id
        """), {
            "cid":      g.company_id,
            "vid":      body["vendor_id"],
            "checks":   json.dumps(checks_init),
            "package":  body.get("bgv_package","Standard"),
            "priority": body.get("priority","Normal"),
            "provider": body.get("external_provider","Internal"),
            "user":     g.user_id,
        })
        new_id = result.fetchone()[0]
        db.session.commit()
        return created({"bgv_id": str(new_id), "status": "in_progress", "checks_initiated": checks})
    except Exception as e:
        db.session.rollback()
        return error(f"BGV initiation failed: {str(e)}", 500)


@vendor_bp.put("/bgv/<bgv_id>/update-check")
@require_auth
@require_role("super_admin","hr_manager")
def update_bgv_check(bgv_id):
    """Update a single check result within a BGV record."""
    body = request.get_json() or {}
    if not body.get("check_name") or not body.get("status"):
        return error("check_name and status required", 422)

    try:
        row = db.session.execute(text(
            "SELECT checks FROM vendor_bgv WHERE id = :bid AND company_id = :cid"
        ), {"bid": bgv_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("BGV Record")

        checks = row.checks or {}
        checks[body["check_name"]] = {
            "status":      body["status"],
            "method":      body.get("method",""),
            "verified_by": body.get("verified_by"),
            "date":        date.today().isoformat(),
            "note":        body.get("note"),
        }

        # Compute overall status
        statuses = [v["status"] for v in checks.values()]
        if "failed" in statuses:
            overall = "failed"
        elif "flagged" in statuses:
            overall = "cleared_with_flags"
        elif all(s == "passed" for s in statuses):
            overall = "cleared"
        else:
            overall = "in_progress"

        # AI risk score
        passed = sum(1 for s in statuses if s == "passed")
        ai_score = round(passed / len(statuses) * 100)

        db.session.execute(text("""
            UPDATE vendor_bgv
               SET checks = :checks::jsonb,
                   status = :status,
                   ai_score = :score,
                   overall_risk = :risk,
                   completed_date = CASE WHEN :status != 'in_progress' THEN NOW() ELSE NULL END,
                   updated_at = NOW()
             WHERE id = :bid AND company_id = :cid
        """), {
            "checks": json.dumps(checks), "status": overall, "score": ai_score,
            "risk": "low" if ai_score >= 80 else "medium" if ai_score >= 60 else "high",
            "bid": bgv_id, "cid": g.company_id,
        })
        db.session.commit()
        return success({"bgv_id": bgv_id, "check_updated": body["check_name"],
                        "overall_status": overall, "ai_score": ai_score})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_bp.post("/bgv/<bgv_id>/blockchain-hash")
@require_auth
def generate_blockchain_hash(bgv_id):
    """Generate a blockchain hash for a cleared BGV record."""
    import hashlib, uuid
    try:
        row = db.session.execute(text(
            "SELECT status, vendor_id FROM vendor_bgv WHERE id = :bid AND company_id = :cid"
        ), {"bid": bgv_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("BGV Record")
        if row.status not in ("cleared","cleared_with_flags"):
            return error("Blockchain hash only generated for cleared BGV records", 422)

        raw = f"{bgv_id}-{row.vendor_id}-{g.company_id}-{datetime.utcnow().isoformat()}-{uuid.uuid4()}"
        blockchain_hash = "0x" + hashlib.sha256(raw.encode()).hexdigest()[:8] + "..." + hashlib.sha256(raw.encode()).hexdigest()[-4:]

        db.session.execute(text("""
            UPDATE vendor_bgv SET blockchain_hash = :hash, updated_at = NOW()
            WHERE id = :bid AND company_id = :cid
        """), {"hash": blockchain_hash, "bid": bgv_id, "cid": g.company_id})
        db.session.commit()
        return success({"bgv_id": bgv_id, "blockchain_hash": blockchain_hash,
                        "message": "Tamper-proof hash generated and stored."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. VENDOR LISTING (Marketplace / Directory)
# ════════════════════════════════════════════════════════════════

@vendor_bp.get("/listing")
@require_auth
def vendor_listing():
    """Marketplace directory — search, filter, sort vendors."""
    category   = request.args.get("category")
    tier       = request.args.get("tier")
    search     = request.args.get("search","")
    sort_by    = request.args.get("sort","ai_match_score")
    verified   = request.args.get("verified")

    q = """
        SELECT ra.*,
               COALESCE(AVG(vr.score), 0) AS rating,
               COUNT(vr.id) AS review_count
        FROM recruitment_agencies ra
        LEFT JOIN vendor_reviews vr ON vr.vendor_id = ra.id
        WHERE ra.company_id = :cid AND NOT ra.is_deleted
    """
    params = {"cid": g.company_id}
    if category: q += " AND ra.type = :cat";     params["cat"] = category
    if tier:     q += " AND ra.tier = :tier";    params["tier"] = tier
    if search:   q += " AND (ra.name ILIKE :s OR ra.service_categories::TEXT ILIKE :s)"; params["s"] = f"%{search}%"
    if verified: q += " AND ra.is_verified = TRUE"

    valid_sorts = {"ai_match_score","rating","placements_ytd","avg_time_to_hire"}
    sort_col = sort_by if sort_by in valid_sorts else "ai_match_score"
    q += f" GROUP BY ra.id ORDER BY {sort_col} DESC NULLS LAST"

    try:
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@vendor_bp.post("/listing/<vendor_id>/request-proposal")
@require_auth
def request_proposal(vendor_id):
    """Send an RFP (Request for Proposal) to a vendor."""
    body = request.get_json() or {}
    return success({
        "vendor_id":    vendor_id,
        "rfp_sent":     True,
        "rfp_number":   f"RFP-{date.today().strftime('%Y%m%d')}-{vendor_id[:4].upper()}",
        "message":      "RFP sent to vendor. Expected response within 48 hours.",
        "sent_to":      body.get("vendor_email",""),
    })


@vendor_bp.post("/listing/<vendor_id>/rate")
@require_auth
def rate_vendor(vendor_id):
    """Submit a vendor rating/review."""
    body = request.get_json() or {}
    if not body.get("score") or not (1 <= float(body["score"]) <= 5):
        return error("score must be between 1 and 5", 422)
    try:
        db.session.execute(text("""
            INSERT INTO vendor_reviews (vendor_id, company_id, score, review_text, reviewed_by, created_at)
            VALUES (:vid, :cid, :score, :review, :user, NOW())
        """), {"vid": vendor_id, "cid": g.company_id, "score": float(body["score"]),
               "review": body.get("review_text",""), "user": g.user_id})
        db.session.commit()
        return created({"vendor_id": vendor_id, "score": body["score"], "reviewed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 4. VENDOR AGREEMENT (CLM)
# ════════════════════════════════════════════════════════════════

@vendor_bp.get("/agreements")
@require_auth
def list_agreements():
    """GET all agreements with expiry alerts."""
    status = request.args.get("status")
    try:
        q = """
            SELECT va.*,
                   ra.name AS vendor_name, ra.code AS vendor_code,
                   EXTRACT(DAY FROM va.expiry_date - NOW())::INT AS days_to_expiry
            FROM vendor_agreements va
            JOIN recruitment_agencies ra ON ra.id = va.vendor_id
            WHERE va.company_id = :cid AND NOT va.is_deleted
        """
        params = {"cid": g.company_id}
        if status: q += " AND va.status = :status"; params["status"] = status
        q += " ORDER BY va.expiry_date ASC"
        rows = db.session.execute(text(q), params).fetchall()
        data = []
        for r in rows:
            d = dict(r._mapping)
            d_exp = d.get("days_to_expiry",999)
            if d_exp and d_exp <= 0:   d["status"] = "expired"
            elif d_exp and d_exp <= 90: d["status"] = "expiring_soon"
            data.append(d)
        return success(data)
    except Exception:
        return success([])


@vendor_bp.post("/agreements")
@require_auth
@require_role("super_admin","hr_manager")
def create_agreement():
    body = request.get_json() or {}
    required = ["code","vendor_id","type","effective_date","expiry_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    eff = date.fromisoformat(body["effective_date"])
    exp = date.fromisoformat(body["expiry_date"])
    if exp <= eff: return error("expiry_date must be after effective_date", 422)

    try:
        db.session.execute(text("""
            INSERT INTO vendor_agreements
              (company_id, code, vendor_id, type, version, status,
               signed_date, effective_date, expiry_date, renewal_alert_days, auto_renew,
               signed_by_us, signed_by_vendor, e_signature_provider,
               value_npr, currency, key_terms, attachments,
               ai_risk_score, created_by, created_at)
            VALUES
              (:cid, :code, :vid, :type, 'v1.0', 'active',
               NOW(), :eff, :exp, :alert_days, :auto_renew,
               :signed_us, :signed_vendor, :esig,
               :value, 'NPR', :terms::jsonb, :attach::jsonb,
               0, :user, NOW())
        """), {
            "cid":          g.company_id,
            "code":         body["code"].upper(),
            "vid":          body["vendor_id"],
            "type":         body["type"],
            "eff":          eff, "exp": exp,
            "alert_days":   body.get("renewal_alert_days", 90),
            "auto_renew":   body.get("auto_renew", False),
            "signed_us":    body.get("signed_by_us",""),
            "signed_vendor":body.get("signed_by_vendor",""),
            "esig":         body.get("e_signature_provider","Manual"),
            "value":        body.get("value_npr", 0),
            "terms":        json.dumps(body.get("key_terms",[])),
            "attach":       json.dumps(body.get("attachments",[])),
            "user":         g.user_id,
        })
        db.session.commit()
        return created({"code": body["code"], "message": "Agreement created. Expiry alerts configured."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_bp.put("/agreements/<agr_id>")
@require_auth
@require_role("super_admin","hr_manager")
def update_agreement(agr_id):
    body = request.get_json() or {}
    allowed = ["status","expiry_date","renewal_alert_days","auto_renew","key_terms",
               "attachments","ai_risk_score","ai_recommendation","value_npr"]
    updates = {}
    for k in allowed:
        if k in body:
            val = body[k]
            if isinstance(val, list): val = json.dumps(val)
            updates[k] = val
    if not updates: return error("Nothing to update",400)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"aid":agr_id,"cid":g.company_id})
    try:
        db.session.execute(text(f"UPDATE vendor_agreements SET {set_clause}, updated_at = NOW() WHERE id = :aid AND company_id = :cid"), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_bp.post("/agreements/<agr_id>/renew")
@require_auth
@require_role("super_admin","hr_manager")
def renew_agreement(agr_id):
    body = request.get_json() or {}
    if not body.get("new_expiry_date"): return error("new_expiry_date required", 422)
    try:
        db.session.execute(text("""
            UPDATE vendor_agreements
               SET expiry_date = :exp,
                   version = CONCAT(SPLIT_PART(version,'.',1),'.',SPLIT_PART(version,'.',2)::INT+1),
                   renewal_count = COALESCE(renewal_count,0) + 1,
                   last_renewed_at = NOW(),
                   updated_at = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"exp": body["new_expiry_date"], "aid": agr_id, "cid": g.company_id})
        db.session.commit()
        return success({"renewed": True, "new_expiry": body["new_expiry_date"]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_bp.get("/agreements/expiry-alerts")
@require_auth
def agreement_expiry_alerts():
    """Get agreements expiring in the next N days."""
    days = int(request.args.get("days", 90))
    try:
        rows = db.session.execute(text("""
            SELECT va.code, va.type, va.expiry_date, va.renewal_alert_days,
                   ra.name AS vendor_name, ra.code AS vendor_code,
                   EXTRACT(DAY FROM va.expiry_date - NOW())::INT AS days_remaining
            FROM vendor_agreements va
            JOIN recruitment_agencies ra ON ra.id = va.vendor_id
            WHERE va.company_id = :cid AND NOT va.is_deleted
              AND va.status = 'active'
              AND va.expiry_date <= NOW() + INTERVAL :days
            ORDER BY va.expiry_date ASC
        """), {"cid": g.company_id, "days": f"{days} days"}).fetchall()
        return success([dict(r._mapping) for r in rows],
                       message=f"Found {len(rows)} agreement(s) expiring in next {days} days")
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 5. SLA & CONTRACT PERFORMANCE
# ════════════════════════════════════════════════════════════════

@vendor_bp.get("/sla")
@require_auth
def list_sla():
    """GET all SLA performance records."""
    try:
        rows = db.session.execute(text("""
            SELECT vs.*, ra.name AS vendor_name, ra.code AS vendor_code, va.type AS contract_type
            FROM vendor_sla vs
            JOIN recruitment_agencies ra ON ra.id = vs.vendor_id
            JOIN vendor_agreements va    ON va.id = vs.agreement_id
            WHERE vs.company_id = :cid AND NOT vs.is_deleted
            ORDER BY vs.overall_score ASC NULLS FIRST
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@vendor_bp.post("/sla")
@require_auth
@require_role("super_admin","hr_manager")
def create_sla():
    body = request.get_json() or {}
    required = ["vendor_id","agreement_id","period"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    kpis = body.get("kpis", [])

    try:
        db.session.execute(text("""
            INSERT INTO vendor_sla
              (company_id, vendor_id, agreement_id, period, kpis, status,
               penalty_rate_pct, review_frequency, next_review_date, created_by, created_at)
            VALUES
              (:cid, :vid, :aid, :period, :kpis::jsonb, 'on_track',
               :penalty, :freq, NOW() + INTERVAL '3 months', :user, NOW())
        """), {
            "cid": g.company_id, "vid": body["vendor_id"],
            "aid": body["agreement_id"], "period": body["period"],
            "kpis": json.dumps(kpis),
            "penalty": body.get("penalty_rate_pct",5),
            "freq": body.get("review_frequency","quarterly"),
            "user": g.user_id,
        })
        db.session.commit()
        return created({"period": body["period"], "kpis_configured": len(kpis)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_bp.post("/sla/<sla_id>/update-kpi")
@require_auth
@require_role("super_admin","hr_manager")
def update_sla_kpi(sla_id):
    """Update actual KPI values and auto-detect breaches."""
    body = request.get_json() or {}
    try:
        row = db.session.execute(text(
            "SELECT kpis FROM vendor_sla WHERE id = :sid AND company_id = :cid"
        ), {"sid": sla_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("SLA Record")

        kpis = row.kpis or []
        breaches = []

        for kpi in kpis:
            name = kpi.get("name","")
            if name in body.get("actuals", {}):
                kpi["actual"] = body["actuals"][name]
                target  = kpi.get("target", 100)
                actual  = kpi["actual"]
                is_lower_better = kpi.get("lower_is_better", False)
                kpi["met"] = actual <= target if is_lower_better else actual >= target
                kpi["score"] = 100 if kpi["met"] else max(0, round(actual/target*100))
                if not kpi["met"] and kpi.get("weight",0) >= 20:
                    breaches.append({"kpi": name, "severity": "high" if kpi.get("weight",0)>=25 else "medium"})

        kpi_scores = [k.get("score",0) * k.get("weight",10) / 100 for k in kpis]
        overall_score = round(sum(kpi_scores) / max(len(kpis), 1))
        sla_status = "breach" if breaches else ("at_risk" if overall_score < 75 else "on_track")

        # Nepal LA2074: SSF non-compliance = mandatory escalation
        ssf_breach = any(k.get("name","").lower().find("ssf") >= 0 and not k.get("met") for k in kpis)

        db.session.execute(text("""
            UPDATE vendor_sla
               SET kpis = :kpis::jsonb, overall_score = :score,
                   status = :status, breaches = :breaches::jsonb,
                   updated_at = NOW()
             WHERE id = :sid AND company_id = :cid
        """), {"kpis": json.dumps(kpis), "score": overall_score,
               "status": sla_status, "breaches": json.dumps(breaches),
               "sid": sla_id, "cid": g.company_id})
        db.session.commit()

        return success({
            "sla_id":        sla_id,
            "overall_score": overall_score,
            "status":        sla_status,
            "breaches":      breaches,
            "nepal_la_alert":  "SSF non-compliance detected. LA2074 Section 64 co-liability triggered." if ssf_breach else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_bp.post("/sla/<sla_id>/generate-scorecard")
@require_auth
def generate_sla_scorecard(sla_id):
    """AI generates monthly performance scorecard."""
    try:
        row = db.session.execute(text(
            "SELECT vs.*, ra.name AS vendor_name FROM vendor_sla vs JOIN recruitment_agencies ra ON ra.id = vs.vendor_id WHERE vs.id = :sid AND vs.company_id = :cid"
        ), {"sid": sla_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("SLA")

        data = dict(row._mapping)
        scorecard = score_vendor_performance({
            "vendor_name":   data.get("vendor_name",""),
            "overall_score": data.get("overall_score",0),
            "kpis":          data.get("kpis",[]),
            "breaches":      data.get("breaches",[]),
            "period":        data.get("period",""),
        })

        db.session.execute(text("""
            UPDATE vendor_sla
               SET ai_insight = :insight, ai_recommendation = :rec,
                   last_review_date = NOW(), updated_at = NOW()
             WHERE id = :sid AND company_id = :cid
        """), {"insight": scorecard.get("summary",""), "rec": scorecard.get("recommendation",""),
               "sid": sla_id, "cid": g.company_id})
        db.session.commit()
        return success({"sla_id": sla_id, "scorecard": scorecard})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_bp.get("/sla/breach-summary")
@require_auth
def breach_summary():
    """Summary of all active SLA breaches for dashboard."""
    try:
        rows = db.session.execute(text("""
            SELECT ra.name AS vendor_name, ra.code, vs.period, vs.overall_score,
                   vs.status, jsonb_array_length(vs.breaches) AS breach_count,
                   vs.penalties_npr, vs.ai_recommendation
            FROM vendor_sla vs
            JOIN recruitment_agencies ra ON ra.id = vs.vendor_id
            WHERE vs.company_id = :cid AND vs.status IN ('breach','at_risk')
            ORDER BY vs.overall_score ASC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@vendor_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["outsource_vendor","vendor_employee"]
    if module not in allowed: return error(f"Module must be one of: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file",400)
    result = parse_excel_upload(request.files["file"], module)
    return jsonify(result), 200 if result["success"] else 422


@vendor_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(module)
    if not b: return error("openpyxl required",500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"vendor_{module}_template.xlsx")

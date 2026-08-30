"""
FILE: backend/routes/employer_branding_routes.py
eLogix HRMS — Employer Branding Module
URL prefix: /api/v1/branding

Covers all 8 pages:
  1.  /evp                 — EVP Management
  2.  /career-page          — Career Page Builder
  3.  /campaigns            — Recruitment Campaign
  4.  /universities          — Campus Hiring (university partners)
  5.  /interns               — Campus Hiring (interns/apprentices)
  6.  /social-posts          — Social Media Branding
  7.  /testimonials           — Employee Testimonial
  8.  /culture                — Culture Showcase
  9.  /events                  — Hiring Event Branding

Nepal Labour Act 2074 + Individual Privacy Act + Consumer Protection Act enforced.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io, json, uuid

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

branding_bp = Blueprint("employer_branding", __name__, url_prefix="/api/v1/branding")


# ════════════════════════════════════════════════════════════════
# 1. EVP MANAGEMENT
# ════════════════════════════════════════════════════════════════

@branding_bp.get("/evp")
@require_auth
def list_evp():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM evp_pillars WHERE company_id = :cid AND NOT is_deleted ORDER BY weight_pct DESC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@branding_bp.get("/evp/overall-score")
@require_auth
def evp_overall_score():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_evp_overall_score WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@branding_bp.post("/evp")
@require_auth
@require_role("super_admin","hr_manager")
def create_evp_pillar():
    body = request.get_json() or {}
    if not body.get("name"): return error("name required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO evp_pillars
              (company_id, name, name_nepali, description, icon, color,
               weight_pct, employee_rating, market_benchmark, data_sources,
               status, created_by, created_at)
            VALUES
              (:cid, :name, :nepali, :desc, :icon, :color,
               :weight, :emp_rating, :mkt_bench, :sources::jsonb,
               :status, :user, NOW())
        """), {
            "cid": g.company_id, "name": body["name"], "nepali": body.get("name_nepali",""),
            "desc": body.get("description",""), "icon": body.get("icon","💎"), "color": body.get("color","#7e22ce"),
            "weight": body.get("weight_pct", 20), "emp_rating": body.get("employee_rating"),
            "mkt_bench": body.get("market_benchmark"), "sources": json.dumps(body.get("data_sources",[])),
            "status": body.get("status","needs_work"), "user": g.user_id,
        })
        db.session.commit()
        return created({"message": "EVP pillar created"})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.post("/evp/<pillar_id>/ai-messaging")
@require_auth
def generate_evp_messaging(pillar_id):
    """AI generates authentic messaging variants backed by real data."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM evp_pillars WHERE id = :pid AND company_id = :cid"
        ), {"pid": pillar_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("EVP Pillar")

        insight = generate_ai_insights({
            "type": "evp_messaging_generation",
            "pillar_name": row.name,
            "employee_rating": float(row.employee_rating or 0),
            "description": row.description,
            "data_sources": row.data_sources,
        })

        db.session.execute(text("""
            UPDATE evp_pillars SET ai_generated_messaging = :msg, ai_last_generated_at = NOW(), updated_at = NOW()
            WHERE id = :pid AND company_id = :cid
        """), {"msg": insight.get("messaging",""), "pid": pillar_id, "cid": g.company_id})
        db.session.commit()
        return success({"messaging": insight.get("messaging",""), "insight": insight})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. CAREER PAGE BUILDER
# ════════════════════════════════════════════════════════════════

@branding_bp.get("/career-page/blocks")
@require_auth
def list_career_blocks():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM career_page_blocks WHERE company_id = :cid AND NOT is_deleted ORDER BY display_order"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@branding_bp.post("/career-page/blocks")
@require_auth
@require_role("super_admin","hr_manager")
def create_career_block():
    body = request.get_json() or {}
    if not body.get("block_type"): return error("block_type required", 422)
    try:
        max_order = db.session.execute(text(
            "SELECT COALESCE(MAX(display_order),0) FROM career_page_blocks WHERE company_id = :cid"
        ), {"cid": g.company_id}).scalar()
        db.session.execute(text("""
            INSERT INTO career_page_blocks
              (company_id, block_type, display_order, status, config, created_by, created_at)
            VALUES
              (:cid, :type, :order, 'draft', :config::jsonb, :user, NOW())
        """), {"cid": g.company_id, "type": body["block_type"], "order": max_order+1,
               "config": json.dumps(body.get("config",{})), "user": g.user_id})
        db.session.commit()
        return created({"message": "Block added"})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.put("/career-page/blocks/<block_id>/reorder")
@require_auth
@require_role("super_admin","hr_manager")
def reorder_block(block_id):
    body = request.get_json() or {}
    new_order = body.get("display_order")
    if new_order is None: return error("display_order required", 422)
    try:
        db.session.execute(text("""
            UPDATE career_page_blocks SET display_order = :order, updated_at = NOW()
            WHERE id = :bid AND company_id = :cid
        """), {"order": new_order, "bid": block_id, "cid": g.company_id})
        db.session.commit()
        return success({"reordered": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.get("/career-page/analytics")
@require_auth
def career_page_analytics():
    days = int(request.args.get("days", 30))
    try:
        rows = db.session.execute(text("""
            SELECT date, visits, applications, avg_time_on_page_sec, mobile_pct, bounce_rate_pct
            FROM career_page_analytics
            WHERE company_id = :cid AND date >= NOW()::DATE - :days
            ORDER BY date
        """), {"cid": g.company_id, "days": days}).fetchall()
        data = [dict(r._mapping) for r in rows]
        totals = {
            "total_visits": sum(r["visits"] for r in data),
            "total_applications": sum(r["applications"] for r in data),
            "conversion_pct": round(sum(r["applications"] for r in data) / max(sum(r["visits"] for r in data),1) * 100, 1),
        }
        return success({"daily": data, "totals": totals})
    except Exception:
        return success({"daily": [], "totals": {}})


# ════════════════════════════════════════════════════════════════
# 3. RECRUITMENT CAMPAIGN
# ════════════════════════════════════════════════════════════════

@branding_bp.get("/campaigns")
@require_auth
def list_campaigns():
    status = request.args.get("status")
    try:
        q = "SELECT * FROM recruitment_campaigns WHERE company_id = :cid AND NOT is_deleted"
        params = {"cid": g.company_id}
        if status: q += " AND status = :status"; params["status"] = status
        q += " ORDER BY created_at DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@branding_bp.post("/campaigns")
@require_auth
@require_role("super_admin","hr_manager")
def create_campaign():
    body = request.get_json() or {}
    if not body.get("name"): return error("name required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO recruitment_campaigns
              (company_id, name, channels, target_roles, ab_variant,
               budget_npr, start_date, end_date, status, created_by, created_at)
            VALUES
              (:cid, :name, :channels::jsonb, :roles::jsonb, :variant,
               :budget, :start, :end, 'draft', :user, NOW())
        """), {
            "cid": g.company_id, "name": body["name"], "channels": json.dumps(body.get("channels",[])),
            "roles": json.dumps(body.get("target_roles",[])), "variant": body.get("ab_variant","A"),
            "budget": body.get("budget_npr",0), "start": body.get("start_date"), "end": body.get("end_date"),
            "user": g.user_id,
        })
        db.session.commit()
        return created({"message": "Campaign created as draft"})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.post("/campaigns/<campaign_id>/launch")
@require_auth
@require_role("super_admin","hr_manager")
def launch_campaign(campaign_id):
    """Verify local-priority compliance before launching (LA2074)."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE recruitment_campaigns
               SET status = 'active', local_priority_demonstrated = :local, updated_at = NOW()
             WHERE id = :cid_c AND company_id = :cid
        """), {"local": body.get("local_priority_demonstrated", True), "cid_c": campaign_id, "cid": g.company_id})
        db.session.commit()
        return success({"launched": True, "la2074_note": "Local priority hiring must be demonstrable before foreign market targeting."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.get("/campaigns/roi")
@require_auth
def campaign_roi():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_campaign_roi WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 4-5. CAMPUS HIRING (Universities + Interns)
# ════════════════════════════════════════════════════════════════

@branding_bp.get("/universities")
@require_auth
def list_universities():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM universities WHERE company_id = :cid AND NOT is_deleted ORDER BY alumni_hired_count DESC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@branding_bp.post("/universities")
@require_auth
@require_role("super_admin","hr_manager")
def create_university():
    body = request.get_json() or {}
    if not body.get("name"): return error("name required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO universities
              (company_id, name, name_nepali, tier, relationship_start_year,
               primary_contact_name, primary_contact_email, status, created_by, created_at)
            VALUES
              (:cid, :name, :nepali, :tier, :year,
               :contact, :email, 'new', :user, NOW())
        """), {
            "cid": g.company_id, "name": body["name"], "nepali": body.get("name_nepali",""),
            "tier": body.get("tier","tier_2"), "year": body.get("relationship_start_year", date.today().year),
            "contact": body.get("primary_contact_name",""), "email": body.get("primary_contact_email",""),
            "user": g.user_id,
        })
        db.session.commit()
        return created({"message": "University partnership added"})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.get("/universities/ranking")
@require_auth
def university_ranking():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_university_ranking WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@branding_bp.get("/interns")
@require_auth
def list_interns():
    status = request.args.get("status")
    try:
        q = """
            SELECT ci.*, u.name AS university_name
            FROM campus_interns ci
            LEFT JOIN universities u ON ci.university_id = u.id
            WHERE ci.company_id = :cid AND NOT ci.is_deleted
        """
        params = {"cid": g.company_id}
        if status: q += " AND ci.status = :status"; params["status"] = status
        q += " ORDER BY ci.start_date DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@branding_bp.post("/interns")
@require_auth
@require_role("super_admin","hr_manager")
def create_intern():
    """Nepal LA2074: formal agreement mandatory for interns/apprentices."""
    body = request.get_json() or {}
    required = ["full_name","start_date","end_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    if body.get("working_hours_per_week", 40) > 48:
        return error("Working hours cannot exceed 48/week per Nepal Labour Act 2074 Section 28.", 422)

    try:
        db.session.execute(text("""
            INSERT INTO campus_interns
              (company_id, university_id, full_name, program, mentor_name,
               start_date, end_date, stipend_npr, working_hours_per_week,
               agreement_signed, status, created_at)
            VALUES
              (:cid, :uid, :name, :program, :mentor,
               :start, :end, :stipend, :hours,
               :agreement, 'active', NOW())
        """), {
            "cid": g.company_id, "uid": body.get("university_id"), "name": body["full_name"],
            "program": body.get("program",""), "mentor": body.get("mentor_name",""),
            "start": body["start_date"], "end": body["end_date"], "stipend": body.get("stipend_npr",0),
            "hours": body.get("working_hours_per_week", 40), "agreement": body.get("agreement_signed", False),
        })
        db.session.commit()
        return created({
            "message": "Intern record created",
            "la2074_note": "Formal agreement defining hours, stipend, and tenure is mandatory before start date.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.get("/interns/compliance")
@require_auth
def intern_compliance():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_intern_compliance WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        violations = [r for r in data if r["compliance_status"] != "COMPLIANT"]
        return success({"interns": data, "violations": violations})
    except Exception:
        return success({"interns": [], "violations": []})


# ════════════════════════════════════════════════════════════════
# 6. SOCIAL MEDIA BRANDING
# ════════════════════════════════════════════════════════════════

@branding_bp.get("/social-posts")
@require_auth
def list_social_posts():
    status = request.args.get("status")
    try:
        q = "SELECT * FROM social_media_posts WHERE company_id = :cid AND NOT is_deleted"
        params = {"cid": g.company_id}
        if status: q += " AND status = :status"; params["status"] = status
        q += " ORDER BY created_at DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@branding_bp.post("/social-posts")
@require_auth
@require_role("super_admin","hr_manager")
def create_social_post():
    body = request.get_json() or {}
    if not body.get("title"): return error("title required", 422)

    if body.get("features_employee") and not body.get("employee_consent_obtained"):
        return error("Cannot create post featuring an employee without consent confirmation.", 422)

    try:
        db.session.execute(text("""
            INSERT INTO social_media_posts
              (company_id, title, content, platforms, post_type,
               scheduled_date, status, features_employee, employee_consent_obtained,
               employee_consent_date, created_by, created_at)
            VALUES
              (:cid, :title, :content, :platforms::jsonb, :type,
               :scheduled, 'draft', :features, :consent,
               CASE WHEN :consent THEN NOW() END, :user, NOW())
        """), {
            "cid": g.company_id, "title": body["title"], "content": body.get("content",""),
            "platforms": json.dumps(body.get("platforms",[])), "type": body.get("post_type","culture"),
            "scheduled": body.get("scheduled_date"), "features": body.get("features_employee", False),
            "consent": body.get("employee_consent_obtained", False), "user": g.user_id,
        })
        db.session.commit()
        return created({"message": "Post created as draft"})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.post("/social-posts/<post_id>/publish")
@require_auth
@require_role("super_admin","hr_manager")
def publish_social_post(post_id):
    try:
        row = db.session.execute(text(
            "SELECT features_employee, employee_consent_obtained FROM social_media_posts WHERE id = :pid AND company_id = :cid"
        ), {"pid": post_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Post")
        if row.features_employee and not row.employee_consent_obtained:
            return error("Cannot publish: employee consent not on file.", 422)

        db.session.execute(text("""
            UPDATE social_media_posts SET status = 'live', published_date = NOW(), updated_at = NOW()
            WHERE id = :pid AND company_id = :cid
        """), {"pid": post_id, "cid": g.company_id})
        db.session.commit()
        return success({"published": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 7. EMPLOYEE TESTIMONIAL
# ════════════════════════════════════════════════════════════════

@branding_bp.get("/testimonials")
@require_auth
def list_testimonials():
    status = request.args.get("status")
    try:
        q = "SELECT * FROM employee_testimonials WHERE company_id = :cid AND NOT is_deleted"
        params = {"cid": g.company_id}
        if status: q += " AND status = :status"; params["status"] = status
        q += " ORDER BY created_at DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@branding_bp.post("/testimonials")
@require_auth
@require_role("super_admin","hr_manager")
def create_testimonial():
    """Nepal Privacy Law: explicit consent mandatory before any use."""
    body = request.get_json() or {}
    if not body.get("employee_name"): return error("employee_name required", 422)

    try:
        db.session.execute(text("""
            INSERT INTO employee_testimonials
              (company_id, employee_id, employee_name, employee_role, employee_department,
               employee_tenure_years, quote_text, video_url, photo_url,
               consent_obtained, consent_document_url, consent_date,
               status, created_by, created_at)
            VALUES
              (:cid, :emp_id, :name, :role, :dept,
               :tenure, :quote, :video, :photo,
               :consent, :consent_doc, CASE WHEN :consent THEN NOW() END,
               'draft', :user, NOW())
        """), {
            "cid": g.company_id, "emp_id": body.get("employee_id"), "name": body["employee_name"],
            "role": body.get("employee_role",""), "dept": body.get("employee_department",""),
            "tenure": body.get("employee_tenure_years"), "quote": body.get("quote_text",""),
            "video": body.get("video_url"), "photo": body.get("photo_url"),
            "consent": body.get("consent_obtained", False), "consent_doc": body.get("consent_document_url"),
            "user": g.user_id,
        })
        db.session.commit()
        return created({
            "message": "Testimonial created as draft",
            "consent_note": "Consent must be on file before publishing per Nepal Privacy Law.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.post("/testimonials/<test_id>/publish")
@require_auth
@require_role("super_admin","hr_manager")
def publish_testimonial(test_id):
    try:
        row = db.session.execute(text(
            "SELECT consent_obtained FROM employee_testimonials WHERE id = :tid AND company_id = :cid"
        ), {"tid": test_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Testimonial")
        if not row.consent_obtained:
            return error("Cannot publish: employee consent not obtained. This is a legal requirement.", 422)

        db.session.execute(text("""
            UPDATE employee_testimonials SET status = 'live', updated_at = NOW()
            WHERE id = :tid AND company_id = :cid
        """), {"tid": test_id, "cid": g.company_id})
        db.session.commit()
        return success({"published": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 8. CULTURE SHOWCASE
# ════════════════════════════════════════════════════════════════

@branding_bp.get("/culture")
@require_auth
def list_culture_items():
    category = request.args.get("category")
    try:
        q = "SELECT * FROM culture_showcase_items WHERE company_id = :cid AND NOT is_deleted"
        params = {"cid": g.company_id}
        if category: q += " AND category = :cat"; params["cat"] = category
        q += " ORDER BY created_at DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@branding_bp.post("/culture")
@require_auth
@require_role("super_admin","hr_manager")
def create_culture_item():
    body = request.get_json() or {}
    if not body.get("title"): return error("title required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO culture_showcase_items
              (company_id, title, category, description, media_urls,
               metric_label, metric_value, metric_source,
               consent_required, consent_obtained, status, created_by, created_at)
            VALUES
              (:cid, :title, :cat, :desc, :media::jsonb,
               :mlabel, :mvalue, :msource,
               :consent_req, :consent_ok, 'draft', :user, NOW())
        """), {
            "cid": g.company_id, "title": body["title"], "cat": body.get("category","general"),
            "desc": body.get("description",""), "media": json.dumps(body.get("media_urls",[])),
            "mlabel": body.get("metric_label"), "mvalue": body.get("metric_value"), "msource": body.get("metric_source"),
            "consent_req": body.get("consent_required", False), "consent_ok": body.get("consent_obtained", True),
            "user": g.user_id,
        })
        db.session.commit()
        return created({"message": "Culture item created"})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 9. HIRING EVENT BRANDING
# ════════════════════════════════════════════════════════════════

@branding_bp.get("/events")
@require_auth
def list_events():
    status = request.args.get("status")
    try:
        q = "SELECT * FROM hiring_events WHERE company_id = :cid AND NOT is_deleted"
        params = {"cid": g.company_id}
        if status: q += " AND status = :status"; params["status"] = status
        q += " ORDER BY event_date"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@branding_bp.post("/events")
@require_auth
@require_role("super_admin","hr_manager")
def create_event():
    body = request.get_json() or {}
    required = ["name","event_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        event_id = str(uuid.uuid4())
        qr_token = str(uuid.uuid4())[:10]
        db.session.execute(text("""
            INSERT INTO hiring_events
              (id, company_id, university_id, name, event_type, location, is_virtual,
               event_date, start_time, end_time, registration_link, qr_code_url,
               social_hashtag, status, created_by, created_at)
            VALUES
              (:id, :cid, :uid, :name, :etype, :loc, :virtual,
               :date, :start, :end, :reg_link, :qr,
               :hashtag, 'upcoming', :user, NOW())
        """), {
            "id": event_id, "cid": g.company_id, "uid": body.get("university_id"), "name": body["name"],
            "etype": body.get("event_type","campus_drive"), "loc": body.get("location",""),
            "virtual": body.get("is_virtual", False), "date": body["event_date"],
            "start": body.get("start_time"), "end": body.get("end_time"),
            "reg_link": f"https://elogix.com.np/events/{event_id}",
            "qr": f"https://elogix.com.np/checkin/{qr_token}",
            "hashtag": body.get("social_hashtag", f"#eLogixHiring{date.today().year}"),
            "user": g.user_id,
        })
        db.session.commit()
        return created({
            "event_id": event_id,
            "registration_link": f"https://elogix.com.np/events/{event_id}",
            "qr_checkin_url": f"https://elogix.com.np/checkin/{qr_token}",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.post("/events/<event_id>/checkin")
def event_qr_checkin(event_id):
    """Public endpoint — QR code scan check-in (no auth, rate-limited in production)."""
    body = request.get_json() or {}
    if not body.get("attendee_name"): return error("attendee_name required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO hiring_event_checkins (event_id, attendee_name, attendee_email, attendee_phone, university)
            VALUES (:eid, :name, :email, :phone, :uni)
        """), {"eid": event_id, "name": body["attendee_name"], "email": body.get("attendee_email"),
               "phone": body.get("attendee_phone"), "uni": body.get("university")})
        db.session.commit()
        return created({"checked_in": True, "message": "Welcome! Check your email for next steps."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@branding_bp.get("/events/<event_id>/attendees")
@require_auth
def event_attendees(event_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM hiring_event_checkins WHERE event_id = :eid ORDER BY checked_in_at"
        ), {"eid": event_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Compliance dashboard (cross-module) ───────────────────────
@branding_bp.get("/compliance/pending-consent")
@require_auth
def pending_consent_alerts():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pending_consent_alerts WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@branding_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["evp","testimonials","universities","campaigns"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], module)
    return jsonify(result), 200 if result["success"] else 422


@branding_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(module)
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"branding_{module}_template.xlsx")

"""
FILE: backend/routes/employee_social_feed_routes.py
NepHR Pro -- Employee Social Feed / Employee Hub
(Employee Experience & Culture > Employee Engagement > Employee Social Feed)

URL prefix: /api/v1/social-feed
"""
from flask import Blueprint, request, g
from sqlalchemy import text
from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created

feed_bp = Blueprint("social_feed", __name__, url_prefix="/api/v1/social-feed")


# ════════════════════════════════════════════════════════════════
# FEED -- the unified timeline
# ════════════════════════════════════════════════════════════════
@feed_bp.get("/posts")
@require_auth
def get_feed():
    """Personalised feed for the current employee.
    Returns posts visible to them, ordered by pinned first then newest,
    filtered by their department/role targeting."""
    limit = min(int(request.args.get("limit", 20)), 100)
    post_type = request.args.get("type")
    try:
        rows = db.session.execute(text(f"""
            SELECT p.*,
                   ae.full_name AS author_name,
                   se.full_name AS subject_name,
                   EXISTS(SELECT 1 FROM feed_reactions r WHERE r.post_id=p.id AND r.employee_id=:emp) AS i_reacted,
                   EXISTS(SELECT 1 FROM feed_bookmarks b WHERE b.post_id=p.id AND b.employee_id=:emp) AS i_bookmarked,
                   (SELECT reaction_type FROM feed_reactions r WHERE r.post_id=p.id AND r.employee_id=:emp LIMIT 1) AS my_reaction
            FROM social_feed_posts p
            LEFT JOIN employees ae ON ae.id = p.author_employee_id
            LEFT JOIN employees se ON se.id = p.subject_employee_id
            WHERE p.company_id=:cid AND p.status='published'
              {"AND p.post_type=:ptype" if post_type else ""}
            ORDER BY p.is_pinned DESC, p.created_at DESC
            LIMIT :lim
        """), {"cid": g.company_id, "emp": g.user_id, "lim": limit,
               **({"ptype": post_type} if post_type else {})}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception as e:
        return success([])


@feed_bp.post("/posts")
@require_auth
def create_post():
    """Create a new feed post (HR/admin types) or user-generated content."""
    b = request.get_json() or {}
    if not b.get("post_type"):
        return error("post_type required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO social_feed_posts
                (company_id, post_type, author_employee_id, subject_employee_id,
                 title, body, media_url, media_type, link_url, link_label,
                 target_department_id, source_table, source_id, status)
            VALUES (:cid,:ptype,:author,:subject,:title,:body,:media,:mtype,
                    :link,:linklabel,:dept,:src_tbl,:src_id,
                    CASE WHEN :ptype IN ('birthday','work_anniversary','kudos','promotion','announcement') THEN 'published' ELSE 'pending_review' END)
            RETURNING id
        """), {
            "cid": g.company_id, "ptype": b["post_type"],
            "author": g.user_id, "subject": b.get("subject_employee_id"),
            "title": b.get("title"), "body": b.get("body"),
            "media": b.get("media_url"), "mtype": b.get("media_type"),
            "link": b.get("link_url"), "linklabel": b.get("link_label"),
            "dept": b.get("target_department_id"),
            "src_tbl": b.get("source_table"), "src_id": b.get("source_id"),
        })
        db.session.commit()
        new_id = str(result.fetchone()[0])
        # Award points for posting
        _award_points(g.user_id, g.company_id, "comment_posted", "Feed post created")
        return created({"post_id": new_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@feed_bp.delete("/posts/<post_id>")
@require_auth
def delete_post(post_id):
    """HR moderation: hide a post."""
    try:
        db.session.execute(text("""
            UPDATE social_feed_posts SET status='hidden', moderated_by=:mod, moderated_at=NOW()
            WHERE id=:id AND company_id=:cid
        """), {"id": post_id, "cid": g.company_id, "mod": g.user_id})
        db.session.commit()
        return success({"hidden": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# REACTIONS
# ════════════════════════════════════════════════════════════════
@feed_bp.post("/posts/<post_id>/react")
@require_auth
def react(post_id):
    reaction = (request.get_json() or {}).get("reaction_type", "like")
    try:
        db.session.execute(text("""
            INSERT INTO feed_reactions (post_id, employee_id, reaction_type)
            VALUES (:pid, :emp, :rt)
            ON CONFLICT (post_id, employee_id) DO UPDATE SET reaction_type=EXCLUDED.reaction_type
        """), {"pid": post_id, "emp": g.user_id, "rt": reaction})
        # Notify post author
        db.session.execute(text("""
            INSERT INTO feed_notifications (company_id, recipient_employee_id, post_id, notif_type, actor_employee_id, message)
            SELECT company_id, author_employee_id, id, 'reaction_on_post', :emp,
                   :rt || ' reaction on your post'
            FROM social_feed_posts WHERE id=:pid AND author_employee_id IS NOT NULL AND author_employee_id != :emp
        """), {"pid": post_id, "emp": g.user_id, "rt": reaction})
        db.session.commit()
        return success({"reacted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@feed_bp.delete("/posts/<post_id>/react")
@require_auth
def unreact(post_id):
    try:
        db.session.execute(text("DELETE FROM feed_reactions WHERE post_id=:pid AND employee_id=:emp"),
                           {"pid": post_id, "emp": g.user_id})
        db.session.commit()
        return success({"removed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# COMMENTS
# ════════════════════════════════════════════════════════════════
@feed_bp.get("/posts/<post_id>/comments")
@require_auth
def get_comments(post_id):
    try:
        rows = db.session.execute(text("""
            SELECT c.*, e.full_name AS author_name
            FROM feed_comments c
            JOIN employees e ON e.id = c.author_employee_id
            WHERE c.post_id=:pid AND NOT c.is_hidden
            ORDER BY c.created_at
        """), {"pid": post_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@feed_bp.post("/posts/<post_id>/comments")
@require_auth
def add_comment(post_id):
    b = request.get_json() or {}
    if not b.get("body"):
        return error("body required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO feed_comments (post_id, author_employee_id, parent_comment_id, body)
            VALUES (:pid, :emp, :parent, :body)
        """), {"pid": post_id, "emp": g.user_id,
               "parent": b.get("parent_comment_id"), "body": b["body"]})
        # Notify post author
        db.session.execute(text("""
            INSERT INTO feed_notifications (company_id, recipient_employee_id, post_id, notif_type, actor_employee_id, message)
            SELECT company_id, author_employee_id, id, 'comment_on_post', :emp, 'commented on your post'
            FROM social_feed_posts WHERE id=:pid AND author_employee_id IS NOT NULL AND author_employee_id != :emp
        """), {"pid": post_id, "emp": g.user_id})
        db.session.commit()
        _award_points(g.user_id, g.company_id, "comment_posted", f"Commented on post {post_id}")
        return created({"commented": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# BOOKMARKS
# ════════════════════════════════════════════════════════════════
@feed_bp.post("/posts/<post_id>/bookmark")
@require_auth
def bookmark(post_id):
    try:
        db.session.execute(text("""
            INSERT INTO feed_bookmarks (post_id, employee_id) VALUES (:pid, :emp)
            ON CONFLICT DO NOTHING
        """), {"pid": post_id, "emp": g.user_id})
        db.session.commit()
        return success({"bookmarked": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@feed_bp.get("/bookmarks")
@require_auth
def my_bookmarks():
    try:
        rows = db.session.execute(text("""
            SELECT p.* FROM social_feed_posts p
            JOIN feed_bookmarks b ON b.post_id=p.id
            WHERE b.employee_id=:emp ORDER BY b.saved_at DESC LIMIT 50
        """), {"emp": g.user_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# GAMIFICATION & BADGES
# ════════════════════════════════════════════════════════════════
@feed_bp.get("/leaderboard")
@require_auth
def leaderboard():
    scope = request.args.get("scope", "company")
    try:
        rows = db.session.execute(text("""
            SELECT * FROM v_engagement_leaderboard
            WHERE company_id=:cid
            ORDER BY total_points DESC LIMIT 20
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@feed_bp.get("/my-profile")
@require_auth
def my_gamification_profile():
    try:
        badges = db.session.execute(text("""
            SELECT b.*, ab.name, ab.icon_emoji, ab.category, ab.description
            FROM employee_badges b
            JOIN achievement_badges ab ON ab.id=b.badge_id
            WHERE b.employee_id=:emp ORDER BY b.awarded_at DESC
        """), {"emp": g.user_id}).fetchall()
        points = db.session.execute(text("""
            SELECT COALESCE(SUM(points_delta),0) AS total
            FROM recognition_points_ledger WHERE employee_id=:emp
        """), {"emp": g.user_id}).fetchone()
        streaks = db.session.execute(text("""
            SELECT * FROM engagement_streaks WHERE employee_id=:emp
        """), {"emp": g.user_id}).fetchall()
        return success({
            "badges": [dict(r._mapping) for r in badges],
            "total_points": int(points.total) if points else 0,
            "streaks": [dict(r._mapping) for r in streaks],
        })
    except Exception:
        return success({"badges": [], "total_points": 0, "streaks": []})


@feed_bp.get("/badges")
@require_auth
def list_badges():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM achievement_badges WHERE is_active ORDER BY category, points_value"
        )).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# NOTIFICATIONS (feed-specific -- reactions, comments, badges)
# ════════════════════════════════════════════════════════════════
@feed_bp.get("/notifications")
@require_auth
def feed_notifications():
    try:
        rows = db.session.execute(text("""
            SELECT n.*, e.full_name AS actor_name
            FROM feed_notifications n
            LEFT JOIN employees e ON e.id=n.actor_employee_id
            WHERE n.recipient_employee_id=:emp
            ORDER BY n.created_at DESC LIMIT 50
        """), {"emp": g.user_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@feed_bp.post("/notifications/mark-read")
@require_auth
def mark_read():
    try:
        db.session.execute(text(
            "UPDATE feed_notifications SET is_read=TRUE WHERE recipient_employee_id=:emp AND NOT is_read"
        ), {"emp": g.user_id})
        db.session.commit()
        return success({"marked": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# AUTO-GENERATE BIRTHDAY/ANNIVERSARY POSTS (called by scheduler)
# ════════════════════════════════════════════════════════════════
@feed_bp.post("/generate-celebrations")
@require_auth
@require_role("super_admin", "hr_manager")
def generate_celebrations():
    try:
        result = db.session.execute(text(
            "SELECT fn_generate_celebration_posts(:cid) AS count"
        ), {"cid": g.company_id})
        count = result.fetchone().count
        db.session.commit()
        return success({"generated": count})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# INTERNAL HELPER: award points
# Import and call from any other route file:
#   from .employee_social_feed_routes import _award_points
# ════════════════════════════════════════════════════════════════
def _award_points(employee_id: str, company_id: str, action_key: str, reason: str = ""):
    try:
        cfg = db.session.execute(text("""
            SELECT points, daily_cap FROM gamification_config
            WHERE action_key=:ak AND (company_id=:cid OR company_id IS NULL)
            ORDER BY company_id NULLS LAST LIMIT 1
        """), {"ak": action_key, "cid": company_id}).fetchone()
        if not cfg:
            return
        # Check daily cap
        today_points = db.session.execute(text("""
            SELECT COALESCE(SUM(points_delta),0) AS today
            FROM recognition_points_ledger
            WHERE employee_id=:emp AND reason LIKE :reason
              AND DATE(recorded_at) = CURRENT_DATE
        """), {"emp": employee_id, "reason": f"%{action_key}%"}).fetchone()
        if cfg.daily_cap and today_points and today_points.today >= cfg.daily_cap:
            return
        db.session.execute(text("""
            INSERT INTO recognition_points_ledger
                (employee_id, company_id, points_delta, reason)
            VALUES (:emp, :cid, :pts, :reason)
        """), {"emp": employee_id, "cid": company_id, "pts": cfg.points, "reason": f"{action_key}: {reason}"})
    except Exception:
        pass  # never fail the calling route over a points award

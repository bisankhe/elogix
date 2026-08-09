# ============================================================
# FILE: backend/routes/hr_policy_routes.py
# PURPOSE: Flask REST API endpoints for HR Policy Management
#          - CRUD for policies
#          - Acknowledgment tracking
#          - AI-powered summaries & reminders
#          - Transaction blocking enforcement
#          - Compliance reporting
# STACK: Python 3.11 + Flask + SQLAlchemy + Celery + AI
# ============================================================

from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone, timedelta
from functools import wraps
import uuid
import anthropic
import os

from ..models.hr_policy_models import (
    HRPolicy, HRPolicyCategory, HRPolicyAcknowledgment,
    HRPolicyReadLog, HRPolicyTransactionBlock,
    HRPolicyVersion, HRPolicyAIInteraction
)
from ..database import db_session

policy_bp = Blueprint("hr_policies", __name__, url_prefix="/api/v1/hr-policies")

# ── Anthropic client ──────────────────────────────────────────
ai_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


# ── Auth decorator ────────────────────────────────────────────
def require_auth(f):
    """JWT auth middleware — sets g.employee_id, g.tenant_id, g.role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # In production: decode JWT, set g.employee_id, g.tenant_id, g.role
        # For now: read from headers (replace with real JWT decode)
        g.employee_id = request.headers.get("X-Employee-Id")
        g.tenant_id   = request.headers.get("X-Tenant-Id")
        g.role        = request.headers.get("X-Role", "employee")
        if not g.employee_id or not g.tenant_id:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def require_role(*roles):
    """Role-based access control decorator"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if g.role not in roles:
                return jsonify({"error": "Forbidden — insufficient role"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def log_read_event(acknowledgment_id, employee_id, policy_id,
                   event_type, event_data=None):
    """Write to audit trail"""
    log = HRPolicyReadLog(
        tenant_id=g.tenant_id,
        acknowledgment_id=acknowledgment_id,
        employee_id=employee_id,
        policy_id=policy_id,
        event_type=event_type,
        event_data=event_data or {},
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
        session_id=request.headers.get("X-Session-Id"),
    )
    db_session.add(log)
    db_session.commit()


# ============================================================
# SECTION A: POLICY LIBRARY (Read access)
# ============================================================

@policy_bp.route("/", methods=["GET"])
@require_auth
def list_policies():
    """
    GET /api/v1/hr-policies/
    Returns all published policies for this tenant,
    with the current employee's acknowledgment status.
    """
    policies = db_session.query(HRPolicy).filter_by(
        tenant_id=g.tenant_id,
        status="published",
        is_current_version=True,
        is_active=True
    ).order_by(HRPolicy.control_number).all()

    result = []
    for policy in policies:
        ack = db_session.query(HRPolicyAcknowledgment).filter_by(
            policy_id=policy.id,
            employee_id=g.employee_id,
            policy_version=policy.version
        ).first()

        d = policy.to_dict()
        d["my_acknowledgment"] = ack.to_dict() if ack else {
            "status": "pending",
            "signed_at": None,
            "scroll_pct_reached": 0,
        }
        result.append(d)

    return jsonify({
        "success": True,
        "count": len(result),
        "policies": result
    })


@policy_bp.route("/<policy_id>", methods=["GET"])
@require_auth
def get_policy(policy_id):
    """
    GET /api/v1/hr-policies/{policy_id}
    Returns full policy content + employee's acknowledgment status.
    Also creates acknowledgment record if first time.
    """
    policy = db_session.query(HRPolicy).filter_by(
        id=policy_id, tenant_id=g.tenant_id
    ).first()

    if not policy:
        return jsonify({"error": "Policy not found"}), 404

    # Get or create acknowledgment
    ack = db_session.query(HRPolicyAcknowledgment).filter_by(
        policy_id=policy.id,
        employee_id=g.employee_id,
        policy_version=policy.version
    ).first()

    if not ack:
        ack = HRPolicyAcknowledgment(
            tenant_id=g.tenant_id,
            policy_id=policy.id,
            employee_id=g.employee_id,
            policy_version=policy.version,
            status="pending",
            next_reminder_at=datetime.now(timezone.utc) + timedelta(days=3)
        )
        db_session.add(ack)
        db_session.commit()

    # Mark as opened
    if ack.status == "pending":
        ack.mark_opened()
        db_session.commit()
        log_read_event(ack.id, g.employee_id, policy.id, "opened")

    return jsonify({
        "success": True,
        "policy": policy.to_dict(include_content=True),
        "acknowledgment": ack.to_dict()
    })


@policy_bp.route("/<policy_id>/progress", methods=["POST"])
@require_auth
def update_reading_progress(policy_id):
    """
    POST /api/v1/hr-policies/{policy_id}/progress
    Body: { scroll_pct: 65, time_seconds: 30 }
    Called as employee scrolls through the policy.
    """
    data = request.get_json()
    scroll_pct   = data.get("scroll_pct", 0)
    time_seconds = data.get("time_seconds", 0)

    ack = db_session.query(HRPolicyAcknowledgment).filter_by(
        policy_id=policy_id,
        employee_id=g.employee_id,
    ).first()

    if not ack:
        return jsonify({"error": "Acknowledgment not found"}), 404

    ack.update_reading_progress(scroll_pct, time_seconds)
    db_session.commit()

    # Log scroll event (batch — not every pixel)
    if scroll_pct % 25 == 0:
        log_read_event(ack.id, g.employee_id, policy_id, "scroll_update", {
            "scroll_pct": scroll_pct,
            "time_spent": ack.time_spent_seconds
        })

    return jsonify({
        "success": True,
        "status": ack.status,
        "scroll_pct_reached": ack.scroll_pct_reached,
        "reading_complete": ack.status == "completed"
    })


@policy_bp.route("/<policy_id>/sign", methods=["POST"])
@require_auth
def sign_policy(policy_id):
    """
    POST /api/v1/hr-policies/{policy_id}/sign
    Body: { signature_text: "I have read and agree...", device: "Chrome/Windows" }
    Records digital signature — unlocks transactions.
    """
    data = request.get_json()
    signature_text = data.get("signature_text", "")
    device         = data.get("device", "")

    if not signature_text or len(signature_text) < 10:
        return jsonify({"error": "Valid acknowledgment statement required"}), 400

    policy = db_session.query(HRPolicy).filter_by(
        id=policy_id, tenant_id=g.tenant_id
    ).first()

    if not policy:
        return jsonify({"error": "Policy not found"}), 404

    ack = db_session.query(HRPolicyAcknowledgment).filter_by(
        policy_id=policy.id,
        employee_id=g.employee_id,
        policy_version=policy.version
    ).first()

    if not ack:
        return jsonify({"error": "Please open the policy first"}), 400

    if ack.status == "signed":
        return jsonify({
            "success": True,
            "message": "Already signed",
            "acknowledgment": ack.to_dict()
        })

    # Must have read at least 80%
    if (ack.scroll_pct_reached or 0) < 80:
        return jsonify({
            "error": "Please read the full policy before signing",
            "scroll_required": 80,
            "scroll_current": ack.scroll_pct_reached
        }), 400

    # Record digital signature
    ack.sign(signature_text, request.remote_addr, device)
    db_session.commit()

    # Audit log
    log_read_event(ack.id, g.employee_id, policy.id, "signed", {
        "signature_hash": ack.signature_hash,
        "time_spent_seconds": ack.time_spent_seconds,
        "scroll_pct": ack.scroll_pct_reached
    })

    return jsonify({
        "success": True,
        "message": f"Policy '{policy.title}' signed successfully.",
        "acknowledgment": ack.to_dict(),
        "signature_hash": ack.signature_hash,
        "transactions_unblocked": _check_all_signed(g.tenant_id, g.employee_id)
    })


# ============================================================
# SECTION B: TRANSACTION BLOCKING
# ============================================================

@policy_bp.route("/check-transaction", methods=["POST"])
@require_auth
def check_transaction():
    """
    POST /api/v1/hr-policies/check-transaction
    Body: { transaction_type: "salary" | "promotion" | "leave_request" }
    Returns: { can_proceed: bool, blocking_policies: [], message: str }
    Called BEFORE any salary/promotion/leave transaction.
    """
    data = request.get_json()
    tx_type = data.get("transaction_type", "general")

    # Find unread mandatory policies for this employee
    unread = _get_blocking_policies(g.tenant_id, g.employee_id, tx_type)

    can_proceed = len(unread) == 0

    # Log block if not proceeding
    if not can_proceed:
        for policy_data in unread:
            block = HRPolicyTransactionBlock(
                tenant_id=g.tenant_id,
                employee_id=g.employee_id,
                blocked_by=policy_data["id"],
                transaction_type=tx_type,
                transaction_data=data
            )
            db_session.add(block)
        db_session.commit()

    return jsonify({
        "success": True,
        "can_proceed": can_proceed,
        "blocking_policies": unread,
        "message": (
            "All HR policies acknowledged. You may proceed."
            if can_proceed else
            f"{len(unread)} mandatory HR polic{'y' if len(unread)==1 else 'ies'} "
            f"must be read and acknowledged before this transaction."
        ),
        "redirect_to": "/hr-policies" if not can_proceed else None
    })


def _get_blocking_policies(tenant_id, employee_id, tx_type):
    """Return list of policies blocking this transaction type"""
    policies = db_session.query(HRPolicy).filter_by(
        tenant_id=tenant_id,
        is_mandatory=True,
        status="published",
        is_current_version=True,
    ).all()

    blocking = []
    for p in policies:
        # Check if this policy blocks the transaction type
        blocks = False
        if tx_type == "salary" and p.blocks_salary:
            blocks = True
        elif tx_type == "promotion" and p.blocks_promotion:
            blocks = True
        elif p.blocks_transactions:
            blocks = True

        if not blocks:
            continue

        # Check if signed
        ack = db_session.query(HRPolicyAcknowledgment).filter_by(
            policy_id=p.id,
            employee_id=employee_id,
            policy_version=p.version
        ).filter(HRPolicyAcknowledgment.status == "signed").first()

        if not ack:
            blocking.append({
                "id": str(p.id),
                "control_number": p.control_number,
                "title": p.title,
                "category": p.category.name if p.category else "",
                "estimated_read_mins": p.estimated_read_mins,
            })

    return blocking


def _check_all_signed(tenant_id, employee_id) -> bool:
    """Check if employee has signed ALL mandatory policies"""
    return len(_get_blocking_policies(tenant_id, employee_id, "general")) == 0


# ============================================================
# SECTION C: COMPLIANCE REPORTING
# ============================================================

@policy_bp.route("/compliance/dashboard", methods=["GET"])
@require_auth
@require_role("hr", "super-admin", "executive")
def compliance_dashboard():
    """
    GET /api/v1/hr-policies/compliance/dashboard
    Returns org-wide policy compliance statistics.
    """
    policies = db_session.query(HRPolicy).filter_by(
        tenant_id=g.tenant_id,
        is_mandatory=True,
        status="published",
        is_current_version=True
    ).all()

    total_policies    = len(policies)
    policy_stats      = []
    total_signed      = 0
    total_assignments = 0
    overdue_count     = 0

    for policy in policies:
        acks = db_session.query(HRPolicyAcknowledgment).filter_by(
            policy_id=policy.id,
            policy_version=policy.version
        ).all()

        signed  = sum(1 for a in acks if a.status == "signed")
        pending = sum(1 for a in acks if a.status in ("pending", "opened", "reading"))
        overdue = sum(1 for a in acks if a.status == "overdue")
        total   = len(acks)

        total_signed      += signed
        total_assignments += total
        overdue_count     += overdue

        policy_stats.append({
            "policy_id": str(policy.id),
            "control_number": policy.control_number,
            "title": policy.title,
            "version": policy.version,
            "total_assigned": total,
            "signed": signed,
            "pending": pending,
            "overdue": overdue,
            "completion_pct": round(signed * 100 / total, 1) if total else 0,
            "review_due_soon": policy.is_review_due_soon,
            "next_review_date": policy.next_review_date.isoformat() if policy.next_review_date else None,
        })

    overall_pct = round(total_signed * 100 / total_assignments, 1) if total_assignments else 0

    return jsonify({
        "success": True,
        "summary": {
            "total_policies": total_policies,
            "total_assignments": total_assignments,
            "total_signed": total_signed,
            "overall_compliance_pct": overall_pct,
            "overdue_count": overdue_count,
            "fully_compliant": overall_pct == 100.0
        },
        "policies": policy_stats
    })


@policy_bp.route("/compliance/employee/<employee_id>", methods=["GET"])
@require_auth
def employee_compliance(employee_id):
    """
    GET /api/v1/hr-policies/compliance/employee/{employee_id}
    Returns individual employee's policy compliance status.
    """
    # Employees can only see their own; HR can see anyone
    if g.role == "employee" and str(g.employee_id) != employee_id:
        return jsonify({"error": "Forbidden"}), 403

    policies = db_session.query(HRPolicy).filter_by(
        tenant_id=g.tenant_id,
        is_mandatory=True,
        status="published",
        is_current_version=True
    ).order_by(HRPolicy.control_number).all()

    compliance_list = []
    for policy in policies:
        ack = db_session.query(HRPolicyAcknowledgment).filter_by(
            policy_id=policy.id,
            employee_id=employee_id,
            policy_version=policy.version
        ).first()

        compliance_list.append({
            "policy": policy.to_dict(),
            "acknowledgment": ack.to_dict() if ack else {
                "status": "not_started",
                "signed_at": None,
                "scroll_pct_reached": 0,
            },
            "is_blocking_transactions": not ack or ack.status != "signed"
        })

    signed_count = sum(1 for c in compliance_list
                       if c["acknowledgment"]["status"] == "signed")

    return jsonify({
        "success": True,
        "employee_id": employee_id,
        "compliance_pct": round(signed_count * 100 / len(policies), 1) if policies else 100,
        "signed_count": signed_count,
        "total_policies": len(policies),
        "fully_compliant": signed_count == len(policies),
        "can_process_salary": len(_get_blocking_policies(g.tenant_id, employee_id, "salary")) == 0,
        "can_process_promotion": len(_get_blocking_policies(g.tenant_id, employee_id, "promotion")) == 0,
        "policies": compliance_list
    })


@policy_bp.route("/compliance/audit-log", methods=["GET"])
@require_auth
@require_role("hr", "super-admin")
def audit_log():
    """
    GET /api/v1/hr-policies/compliance/audit-log
    Full audit trail for ISO/SOC2 compliance reporting.
    """
    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    offset   = (page - 1) * per_page

    logs = db_session.query(HRPolicyReadLog).filter_by(
        tenant_id=g.tenant_id
    ).order_by(HRPolicyReadLog.created_at.desc()).offset(offset).limit(per_page).all()

    return jsonify({
        "success": True,
        "page": page,
        "logs": [l.to_dict() for l in logs]
    })


# ============================================================
# SECTION D: AI-POWERED FEATURES
# ============================================================

@policy_bp.route("/<policy_id>/ai-summary", methods=["POST"])
@require_auth
def generate_ai_summary(policy_id):
    """
    POST /api/v1/hr-policies/{policy_id}/ai-summary
    Generates AI summary of the policy in employee's language.
    Body: { language: "ne" }
    """
    data     = request.get_json()
    language = data.get("language", "en")

    policy = db_session.query(HRPolicy).filter_by(
        id=policy_id, tenant_id=g.tenant_id
    ).first()

    if not policy:
        return jsonify({"error": "Policy not found"}), 404

    # Return cached if available
    if policy.ai_summary:
        return jsonify({
            "success": True,
            "summary": policy.ai_summary,
            "key_points": policy.ai_key_points,
            "cached": True
        })

    # Generate with AI
    lang_map = {
        "ne": "Nepali", "hi": "Hindi", "en": "English",
        "ar": "Arabic", "zh": "Chinese"
    }
    lang_name = lang_map.get(language, "English")

    prompt = f"""You are an HR policy expert. Summarize this HR policy for an employee.

POLICY TITLE: {policy.title}
CONTROL NUMBER: {policy.control_number}

POLICY CONTENT:
{policy.content_plain or policy.policy_statement}

PROCEDURES:
{policy.procedures or 'Not specified'}

Please provide:
1. A 3-sentence plain-language summary in {lang_name}
2. 5 key points employees must know (bullet points)
3. What happens if this policy is violated

Format as JSON: {{"summary": "...", "key_points": ["...", ...], "violation_consequence": "..."}}
"""

    response = ai_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    import json
    ai_text = response.content[0].text
    try:
        ai_data = json.loads(ai_text)
    except json.JSONDecodeError:
        ai_data = {"summary": ai_text, "key_points": [], "violation_consequence": ""}

    # Cache it
    policy.ai_summary      = ai_data.get("summary", "")
    policy.ai_key_points   = ai_data.get("key_points", [])
    policy.ai_last_updated = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({
        "success": True,
        "summary": policy.ai_summary,
        "key_points": policy.ai_key_points,
        "violation_consequence": ai_data.get("violation_consequence", ""),
        "cached": False
    })


@policy_bp.route("/<policy_id>/ai-quiz", methods=["POST"])
@require_auth
def generate_ai_quiz(policy_id):
    """
    POST /api/v1/hr-policies/{policy_id}/ai-quiz
    Generates a comprehension quiz for the policy.
    """
    policy = db_session.query(HRPolicy).filter_by(
        id=policy_id, tenant_id=g.tenant_id
    ).first()

    if not policy:
        return jsonify({"error": "Policy not found"}), 404

    prompt = f"""Generate 3 multiple-choice comprehension questions for this HR policy.
Policy: {policy.title}
Content: {policy.content_plain or policy.policy_statement}

Return JSON: {{
  "questions": [
    {{
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "..."
    }}
  ]
}}"""

    response = ai_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    import json
    try:
        quiz_data = json.loads(response.content[0].text)
    except Exception:
        quiz_data = {"questions": []}

    return jsonify({
        "success": True,
        "policy_id": policy_id,
        "quiz": quiz_data
    })


@policy_bp.route("/ai-chat", methods=["POST"])
@require_auth
def ai_policy_chat():
    """
    POST /api/v1/hr-policies/ai-chat
    Body: { question: "What is the maternity leave policy?", policy_id: null }
    AI answers questions about HR policies.
    """
    data      = request.get_json()
    question  = data.get("question", "").strip()
    policy_id = data.get("policy_id")

    if not question:
        return jsonify({"error": "Question is required"}), 400

    # Get relevant policies for context
    context = ""
    if policy_id:
        policy = db_session.query(HRPolicy).filter_by(
            id=policy_id, tenant_id=g.tenant_id
        ).first()
        if policy:
            context = f"Relevant Policy: {policy.title}\n{policy.content_plain or policy.policy_statement}"
    else:
        # Get all published policies for context
        policies = db_session.query(HRPolicy).filter_by(
            tenant_id=g.tenant_id, status="published", is_current_version=True
        ).limit(10).all()
        context = "\n\n".join([f"Policy: {p.title}\n{p.policy_statement}" for p in policies])

    system_prompt = """You are an HR Policy Assistant for NepHR Pro.
Answer employee questions about HR policies accurately and helpfully.
Always cite the policy name and control number when relevant.
Be concise, professional, and empathetic.
If a question involves discipline or legal matters, advise consulting HR directly.
Nepal Labour Act 2017 applies as base law."""

    response = ai_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        system=system_prompt,
        messages=[{
            "role": "user",
            "content": f"Context:\n{context}\n\nEmployee question: {question}"
        }]
    )

    ai_response_text = response.content[0].text

    # Log interaction
    interaction = HRPolicyAIInteraction(
        tenant_id=g.tenant_id,
        employee_id=g.employee_id,
        policy_id=policy_id,
        question=question,
        ai_response=ai_response_text,
        session_id=request.headers.get("X-Session-Id")
    )
    db_session.add(interaction)
    db_session.commit()

    return jsonify({
        "success": True,
        "question": question,
        "answer": ai_response_text,
        "interaction_id": str(interaction.id)
    })


# ============================================================
# SECTION E: POLICY MANAGEMENT (HR Admin)
# ============================================================

@policy_bp.route("/admin/policies", methods=["POST"])
@require_auth
@require_role("hr", "super-admin")
def create_policy():
    """
    POST /api/v1/hr-policies/admin/policies
    Create a new HR policy.
    """
    data = request.get_json()

    policy = HRPolicy(
        tenant_id           = g.tenant_id,
        control_number      = data["control_number"],
        category_id         = data.get("category_id"),
        title               = data["title"],
        slug                = data["title"].lower().replace(" ", "-"),
        purpose             = data["purpose"],
        scope               = data["scope"],
        policy_statement    = data["policy_statement"],
        procedures          = data.get("procedures"),
        responsibilities    = data.get("responsibilities"),
        content_html        = data.get("content_html"),
        content_plain       = data.get("content_plain"),
        local_law_alignment = data.get("local_law_alignment"),
        is_mandatory        = data.get("is_mandatory", True),
        blocks_salary       = data.get("blocks_salary", True),
        blocks_promotion    = data.get("blocks_promotion", True),
        applies_to_roles    = data.get("applies_to_roles", ["all"]),
        applies_to_countries= data.get("applies_to_countries", ["NP"]),
        estimated_read_mins = data.get("estimated_read_mins", 5),
        review_date         = datetime.now(timezone.utc).date(),
        next_review_date    = (datetime.now(timezone.utc) + timedelta(days=365)).date(),
        approved_by_name    = data.get("approved_by_name"),
        approved_by_role    = data.get("approved_by_role"),
        created_by          = g.employee_id,
        status              = "draft"
    )

    db_session.add(policy)
    db_session.commit()

    return jsonify({
        "success": True,
        "message": "Policy created successfully.",
        "policy": policy.to_dict()
    }), 201


@policy_bp.route("/admin/policies/<policy_id>/publish", methods=["POST"])
@require_auth
@require_role("hr", "super-admin")
def publish_policy(policy_id):
    """
    POST /api/v1/hr-policies/admin/policies/{policy_id}/publish
    Publishes a policy and creates acknowledgment records for all employees.
    """
    from ..models.employee_models import Employee  # import your Employee model

    policy = db_session.query(HRPolicy).filter_by(
        id=policy_id, tenant_id=g.tenant_id
    ).first()

    if not policy:
        return jsonify({"error": "Policy not found"}), 404

    if policy.status == "published":
        return jsonify({"error": "Already published"}), 400

    # Publish
    policy.status       = "published"
    policy.published_at = datetime.now(timezone.utc)
    policy.approved_at  = datetime.now(timezone.utc)
    db_session.commit()

    # Create acknowledgment records for all active employees
    employees = db_session.query(Employee).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).all()

    created = 0
    for emp in employees:
        existing = db_session.query(HRPolicyAcknowledgment).filter_by(
            policy_id=policy.id,
            employee_id=emp.id,
            policy_version=policy.version
        ).first()

        if not existing:
            ack = HRPolicyAcknowledgment(
                tenant_id=g.tenant_id,
                policy_id=policy.id,
                employee_id=emp.id,
                policy_version=policy.version,
                status="pending",
                next_reminder_at=datetime.now(timezone.utc) + timedelta(days=3)
            )
            db_session.add(ack)
            created += 1

    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"Policy published. Acknowledgment requests sent to {created} employees.",
        "policy": policy.to_dict(),
        "acknowledgments_created": created
    })


@policy_bp.route("/admin/send-reminders", methods=["POST"])
@require_auth
@require_role("hr", "super-admin")
def send_reminders():
    """
    POST /api/v1/hr-policies/admin/send-reminders
    AI-driven: sends reminder emails to employees with overdue policies.
    Called by Celery scheduler daily.
    """
    now = datetime.now(timezone.utc)

    overdue_acks = db_session.query(HRPolicyAcknowledgment).filter(
        HRPolicyAcknowledgment.status.in_(["pending", "opened", "reading", "overdue"]),
        HRPolicyAcknowledgment.next_reminder_at <= now,
        HRPolicyAcknowledgment.signed_at.is_(None)
    ).all()

    reminders_sent = 0
    for ack in overdue_acks:
        # In production: send email via SES/SendGrid
        # For now: update reminder tracking
        ack.reminder_count   += 1
        ack.last_reminder_at  = now
        ack.next_reminder_at  = now + timedelta(days=2)  # remind again in 2 days
        if ack.status != "overdue" and ack.reminder_count >= 3:
            ack.status = "overdue"

        # Log
        log_read_event(ack.id, str(ack.employee_id), str(ack.policy_id),
                       "reminder_sent", {"reminder_count": ack.reminder_count})
        reminders_sent += 1

    db_session.commit()

    return jsonify({
        "success": True,
        "reminders_sent": reminders_sent,
        "message": f"Sent {reminders_sent} policy reminder notifications."
    })

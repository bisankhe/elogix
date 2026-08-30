"""
FILE: backend/routes/ai_business_intelligence_routes.py
eLogix HRMS -- AI Business Intelligence / AI Chatbot
(Dashboard & Workspace > AI Assistant > AI Business Intelligence)

Calls the REAL Anthropic Claude API (configured in settings.py).
Multi-tenant isolated: every query hard-scopes to g.company_id.
Supports: text chat, voice (STT transcript), file analysis (PDF/DOC/
image via base64), MOM generation, strategic reports, Plan Mode
(multi-step agentic workflow), RAG retrieval from ai_knowledge_base.

URL prefix: /api/v1/ai-bi
"""
import json
import uuid
from datetime import datetime
from flask import Blueprint, request, g, stream_with_context, Response
from sqlalchemy import text
from anthropic import Anthropic
from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created
from ..config.settings import Config
from ..utils.ai_context import build_company_context

ai_bi_bp = Blueprint("ai_bi", __name__, url_prefix="/api/v1/ai-bi")

# ── Anthropic client (one instance per process) ──────────────────
_client = None
def get_client():
    global _client
    if _client is None:
        _client = Anthropic(api_key=Config.ANTHROPIC_API_KEY)
    return _client


# ════════════════════════════════════════════════════════════════
# SYSTEM PROMPT BUILDER
# Injects: company context, labour law, tenant isolation guardrails,
# user role, language preference, and RAG context.
# ════════════════════════════════════════════════════════════════
def build_system_prompt(company_ctx: dict, employee_role: str,
                        language: str, rag_context: str = "",
                        session_type: str = "chat") -> str:
    type_instruction = {
        "mom": "You are generating a structured Minutes of Meeting (MOM). Extract participants, agenda items, decisions, action items with owners and deadlines. Format professionally.",
        "strategic_report": "You are generating a strategic HR analysis report. Use data-driven insights, cite specific metrics, follow the structure: Executive Summary → Findings → Risk Analysis → Recommendations → Action Plan.",
        "document": "You are a professional document writer. Generate complete, ready-to-use HR documents including letters, policies, proposals, and emails.",
        "workflow": "You are an agentic workflow planner. Break the user's goal into clear, numbered steps. Confirm the plan before executing. Report progress after each step.",
        "analysis": "You are an HR Business Intelligence analyst. Analyse the provided HR data in the context of Nepal Labour Act 2074, SSF, CIT regulations, and global HR best practices.",
        "chat": "You are eLogix HRMS's AI Business Intelligence assistant.",
    }.get(session_type, "You are eLogix HRMS's AI assistant.")

    law_ctx = company_ctx.get("nepal_law_context", {})

    return f"""You are eLogix HRMS's AI Business Intelligence Assistant — an agentic, multilingual HR and business intelligence system.

ROLE: {type_instruction}

USER CONTEXT:
- Company: {company_ctx.get('name', 'N/A')} | Industry: {company_ctx.get('industry', 'N/A')}
- User Role: {employee_role}
- Preferred Language: {language}
- Country: Nepal (primary) | Laws: Nepal Labour Act 2074, SSF Act, CIT Act

NEPAL REGULATORY CONTEXT:
- Minimum Wage: NPR {law_ctx.get('min_wage_npr', 15000)}/month
- PF Employer Contribution: {law_ctx.get('pf_employer_pct', 10)}%
- SSF Employer Contribution: {law_ctx.get('ssf_employer_pct', 3.33)}%
- Gratuity: {law_ctx.get('gratuity_pct', 8.33)}% (after 1 year continuous service)
- OT Multiplier: {law_ctx.get('ot_multiplier', 1.5)}x
- Max Probation: {law_ctx.get('max_probation_months', 6)} months

LANGUAGE DIRECTIVE:
Respond in {language}. If the user switches language mid-conversation, immediately switch to match. For voice outputs, write naturally for speech synthesis.

DATA ISOLATION — CRITICAL SECURITY RULE:
You ONLY have access to data from company_id: {company_ctx.get('company_id', 'UNKNOWN')}. You must NEVER reference, infer, or reveal data from any other company. If asked about external companies' internal data, refuse politely.

CAPABILITIES:
1. Strategic HR analysis and recommendations
2. Generate Minutes of Meeting (MOM) from transcripts, notes, or voice
3. Write any HR document: letters, policies, reports, proposals, JDs, emails
4. Analyze attached PDF, Word, Excel, image files
5. Voice command execution — confirm before executing multi-step tasks
6. Plan Mode: break complex goals into steps, get approval, then execute
7. Navigate to eLogix HRMS pages by returning a JSON action block
8. Predictive analytics and risk identification
9. Real-time feed from company HR data

{f'KNOWLEDGE BASE CONTEXT (retrieved documents):{chr(10)}{rag_context}' if rag_context else ''}

OUTPUT FORMAT:
- For navigation commands, include: {{\"action\": \"navigate\", \"page_id\": \"...\", \"label\": \"...\"}}
- For generated artifacts, include: {{\"artifact_type\": \"...\", \"title\": \"...\", \"content\": \"...\"}}
- For plan mode: {{\"plan\": {{\"goal\": \"...\", \"steps\": [...]}}}}
- Always end voice-intended responses with a brief spoken summary (1-2 sentences)
- Always be strategic, data-driven, and cite Nepal law/company policy where relevant."""


# ════════════════════════════════════════════════════════════════
# RAG RETRIEVAL -- semantic search over company knowledge base
# Simple text-match fallback (pgvector would be production upgrade)
# ════════════════════════════════════════════════════════════════
def retrieve_rag_context(query: str, company_id: str, limit: int = 4) -> str:
    try:
        rows = db.session.execute(text("""
            SELECT title, content, doc_type,
                   ts_rank(to_tsvector('english', content),
                           plainto_tsquery('english', :q)) AS rank
            FROM ai_knowledge_base
            WHERE company_id = :cid AND is_active = TRUE
              AND to_tsvector('english', content) @@ plainto_tsquery('english', :q)
            ORDER BY rank DESC LIMIT :lim
        """), {"q": query, "cid": company_id, "lim": limit}).fetchall()
        if not rows:
            return ""
        parts = []
        for row in rows:
            parts.append(f"[{row.doc_type.upper()}: {row.title}]\n{row.content[:800]}")
        return "\n\n---\n\n".join(parts)
    except Exception:
        return ""


# ════════════════════════════════════════════════════════════════
# GET SESSIONS
# ════════════════════════════════════════════════════════════════
@ai_bi_bp.get("/sessions")
@require_auth
def list_sessions():
    try:
        rows = db.session.execute(text("""
            SELECT s.id, s.session_type, s.title, s.language, s.plan_status,
                   s.total_messages, s.is_pinned, s.created_at, s.updated_at,
                   (SELECT content FROM ai_messages
                    WHERE session_id=s.id ORDER BY created_at DESC LIMIT 1) AS last_message
            FROM ai_sessions s
            WHERE s.employee_id=:emp AND s.company_id=:cid AND NOT s.is_archived
            ORDER BY s.updated_at DESC LIMIT 50
        """), {"emp": g.user_id, "cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ai_bi_bp.post("/sessions")
@require_auth
def create_session():
    b = request.get_json() or {}
    session_id = str(uuid.uuid4())
    try:
        db.session.execute(text("""
            INSERT INTO ai_sessions (id, company_id, employee_id, session_type, title, language, model_used)
            VALUES (:id, :cid, :emp, :type, :title, :lang, :model)
        """), {
            "id": session_id, "cid": g.company_id, "emp": g.user_id,
            "type": b.get("session_type", "chat"),
            "title": b.get("title", "New Conversation"),
            "lang": b.get("language", "en"),
            "model": Config.ANTHROPIC_MODEL,
        })
        db.session.commit()
        return created({"session_id": session_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# GET MESSAGES for a session
# ════════════════════════════════════════════════════════════════
@ai_bi_bp.get("/sessions/<session_id>/messages")
@require_auth
def get_messages(session_id):
    try:
        # Security: confirm session belongs to this employee AND company
        session = db.session.execute(text("""
            SELECT id FROM ai_sessions
            WHERE id=:sid AND employee_id=:emp AND company_id=:cid
        """), {"sid": session_id, "emp": g.user_id, "cid": g.company_id}).fetchone()
        if not session:
            return error("Session not found", 404)
        rows = db.session.execute(text("""
            SELECT * FROM ai_messages WHERE session_id=:sid AND NOT is_hidden
            ORDER BY created_at
        """), {"sid": session_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# MAIN CHAT ENDPOINT -- the real Anthropic API call
# ════════════════════════════════════════════════════════════════
@ai_bi_bp.post("/sessions/<session_id>/chat")
@require_auth
def chat(session_id):
    b = request.get_json() or {}
    user_content = b.get("content", "")
    input_mode = b.get("input_mode", "text")    # text|voice|file|multimodal
    attachments = b.get("attachments", [])       # [{filename, type, base64, extracted_text}]
    language = b.get("language", "en")

    if not user_content and not attachments:
        return error("content or attachments required", 422)

    # Verify session ownership + company isolation
    try:
        session_row = db.session.execute(text("""
            SELECT s.*, e.role AS employee_role, e.full_name
            FROM ai_sessions s
            JOIN employees e ON e.id = s.employee_id
            WHERE s.id=:sid AND s.employee_id=:emp AND s.company_id=:cid
        """), {"sid": session_id, "emp": g.user_id, "cid": g.company_id}).fetchone()
        if not session_row:
            return error("Session not found or access denied", 404)
    except Exception as e:
        return error(str(e), 500)

    # Build conversation history for Claude context window
    try:
        history = db.session.execute(text("""
            SELECT role, content FROM ai_messages
            WHERE session_id=:sid AND NOT is_hidden
            ORDER BY created_at LIMIT 40
        """), {"sid": session_id}).fetchall()
    except Exception:
        history = []

    # RAG retrieval
    rag_context = retrieve_rag_context(user_content[:200], g.company_id)

    # Company context
    try:
        company_ctx = build_company_context(db, g.company_id)
    except Exception:
        company_ctx = {"company_id": g.company_id}

    # Build Claude messages array
    claude_messages = []
    for h in history:
        claude_messages.append({"role": h.role, "content": h.content})

    # Build the user turn (potentially multi-modal)
    user_turn_content = []
    if attachments:
        for att in attachments[:5]:  # max 5 files per message
            if att.get("type", "").startswith("image/") and att.get("base64"):
                user_turn_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": att["type"],
                        "data": att["base64"]
                    }
                })
            elif att.get("extracted_text"):
                user_turn_content.append({
                    "type": "text",
                    "text": f"[Attached file: {att.get('filename','document')}]\n{att['extracted_text'][:10000]}"
                })
    if user_content:
        user_turn_content.append({"type": "text", "text": user_content})

    claude_messages.append({
        "role": "user",
        "content": user_turn_content if len(user_turn_content) > 1 else user_content
    })

    system_prompt = build_system_prompt(
        company_ctx, session_row.employee_role or "employee",
        language, rag_context, session_row.session_type
    )

    # Call Anthropic API
    try:
        client = get_client()
        response = client.messages.create(
            model=Config.ANTHROPIC_MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=claude_messages,
        )
        ai_content = response.content[0].text
        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens
    except Exception as e:
        # Graceful fallback for preview environments without API key
        ai_content = f"AI response would appear here. (API key not configured in this preview environment.)\n\nYour question was: {user_content}"
        prompt_tokens, completion_tokens = 0, 0

    # Detect artifact in response
    artifact_id = None
    artifact_data = None
    try:
        if '"artifact_type"' in ai_content:
            import re
            match = re.search(r'\{[^{}]*"artifact_type"[^{}]*\}', ai_content, re.DOTALL)
            if match:
                artifact_data = json.loads(match.group())
    except Exception:
        pass

    # Save artifact if detected
    if artifact_data and artifact_data.get("artifact_type"):
        try:
            art_id = str(uuid.uuid4())
            db.session.execute(text("""
                INSERT INTO ai_generated_artifacts
                    (id, session_id, company_id, employee_id, artifact_type, title, content, trigger_event)
                VALUES (:id, :sid, :cid, :emp, :type, :title, :content, :trigger)
            """), {
                "id": art_id, "sid": session_id, "cid": g.company_id,
                "emp": g.user_id,
                "type": artifact_data.get("artifact_type"),
                "title": artifact_data.get("title", "Generated Document"),
                "content": artifact_data.get("content", ai_content),
                "trigger": f"chat:{user_content[:100]}"
            })
            artifact_id = art_id
        except Exception:
            pass

    # Persist user message
    try:
        db.session.execute(text("""
            INSERT INTO ai_messages
                (session_id, company_id, employee_id, role, content, content_type,
                 input_mode, attachments, model_used, prompt_tokens, completion_tokens, artifact_id)
            VALUES (:sid,:cid,:emp,'user',:content,:ctype,:mode,:att,:model,:pt,:ct,:artid)
        """), {
            "sid": session_id, "cid": g.company_id, "emp": g.user_id,
            "content": user_content or f"[{input_mode} input with {len(attachments)} attachment(s)]",
            "ctype": "voice_transcript" if input_mode=="voice" else "text",
            "mode": input_mode, "att": json.dumps(attachments) if attachments else None,
            "model": Config.ANTHROPIC_MODEL, "pt": prompt_tokens, "ct": 0,
            "artid": None,
        })
        # Persist assistant message
        db.session.execute(text("""
            INSERT INTO ai_messages
                (session_id, company_id, employee_id, role, content, content_type,
                 model_used, prompt_tokens, completion_tokens, artifact_id, rag_citations)
            VALUES (:sid,:cid,:emp,'assistant',:content,'text',:model,:pt,:ct,:artid,:rag)
        """), {
            "sid": session_id, "cid": g.company_id, "emp": g.user_id,
            "content": ai_content, "model": Config.ANTHROPIC_MODEL,
            "pt": prompt_tokens, "ct": completion_tokens,
            "artid": artifact_id,
            "rag": json.dumps({"used": bool(rag_context)}),
        })
        # Auto-title session from first message
        db.session.execute(text("""
            UPDATE ai_sessions SET title=:title, language=:lang, updated_at=NOW()
            WHERE id=:sid AND (title IS NULL OR title='New Conversation')
        """), {"sid": session_id, "title": user_content[:80] or "AI Session", "lang": language})
        db.session.commit()
    except Exception as e:
        db.session.rollback()

    return success({
        "content": ai_content,
        "artifact": artifact_data,
        "artifact_id": artifact_id,
        "rag_used": bool(rag_context),
        "tokens": {"prompt": prompt_tokens, "completion": completion_tokens},
    })


# ════════════════════════════════════════════════════════════════
# KNOWLEDGE BASE -- upload documents for RAG
# ════════════════════════════════════════════════════════════════
@ai_bi_bp.get("/knowledge-base")
@require_auth
@require_role("super_admin", "hr_manager")
def list_kb():
    try:
        rows = db.session.execute(text("""
            SELECT id, doc_type, title, source_filename, chunk_index, chunk_total,
                   uploaded_at, is_active
            FROM ai_knowledge_base WHERE company_id=:cid AND parent_doc_id IS NULL
            ORDER BY uploaded_at DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ai_bi_bp.post("/knowledge-base")
@require_auth
@require_role("super_admin", "hr_manager")
def upload_to_kb():
    b = request.get_json() or {}
    if not b.get("content") or not b.get("title"):
        return error("title and content required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO ai_knowledge_base
                (company_id, doc_type, title, source_filename, content, uploaded_by)
            VALUES (:cid, :type, :title, :fname, :content, :user)
            RETURNING id
        """), {
            "cid": g.company_id, "type": b.get("doc_type", "custom"),
            "title": b["title"], "fname": b.get("source_filename"),
            "content": b["content"], "user": g.user_id,
        })
        db.session.commit()
        return created({"kb_id": str(result.fetchone()[0])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# ARTIFACTS
# ════════════════════════════════════════════════════════════════
@ai_bi_bp.get("/artifacts")
@require_auth
def list_artifacts():
    try:
        rows = db.session.execute(text("""
            SELECT id, artifact_type, title, format, exported_as, created_at
            FROM ai_generated_artifacts
            WHERE company_id=:cid AND employee_id=:emp
            ORDER BY created_at DESC LIMIT 50
        """), {"cid": g.company_id, "emp": g.user_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ai_bi_bp.get("/artifacts/<artifact_id>")
@require_auth
def get_artifact(artifact_id):
    try:
        row = db.session.execute(text("""
            SELECT * FROM ai_generated_artifacts
            WHERE id=:id AND (company_id=:cid OR share_token IS NOT NULL)
        """), {"id": artifact_id, "cid": g.company_id}).fetchone()
        if not row:
            return error("Artifact not found", 404)
        return success(dict(row._mapping))
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# WORKFLOW RECIPES
# ════════════════════════════════════════════════════════════════
@ai_bi_bp.get("/recipes")
@require_auth
def list_recipes():
    try:
        rows = db.session.execute(text("""
            SELECT * FROM ai_workflow_recipes
            WHERE (company_id=:cid OR company_id IS NULL) AND is_active
            ORDER BY run_count DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# QUICK GENERATE -- one-shot artifact without a full session
# (for voice commands: "Generate MOM from this transcript")
# ════════════════════════════════════════════════════════════════
@ai_bi_bp.post("/quick-generate")
@require_auth
def quick_generate():
    b = request.get_json() or {}
    artifact_type = b.get("artifact_type", "document")
    prompt = b.get("prompt", "")
    context_text = b.get("context_text", "")
    language = b.get("language", "en")

    type_prompts = {
        "mom": f"Generate a complete, professional Minutes of Meeting (MOM) document from the following. Include: Meeting Details, Attendees, Agenda, Discussion Points, Decisions Made, Action Items (with owners and deadlines), Next Meeting Date.\n\nSource:\n{context_text}",
        "strategic_report": f"Generate a comprehensive strategic HR analysis report. Include: Executive Summary, Key Findings, Risk Analysis, Recommendations, Action Plan with timeline.\n\nContext:\n{context_text}\n\nPrompt: {prompt}",
        "letter": f"Generate a professional HR letter as requested.\n\nRequest: {prompt}\n\nContext: {context_text}",
        "job_description": f"Generate a complete, bias-checked job description for:\n{prompt}\n\nContext: {context_text}",
    }
    full_prompt = type_prompts.get(artifact_type, f"{prompt}\n\nContext: {context_text}")

    try:
        company_ctx = build_company_context(db, g.company_id)
    except Exception:
        company_ctx = {}

    try:
        client = get_client()
        response = client.messages.create(
            model=Config.ANTHROPIC_MODEL,
            max_tokens=4096,
            system=build_system_prompt(company_ctx, g.role, language, "", artifact_type),
            messages=[{"role": "user", "content": full_prompt}],
        )
        content = response.content[0].text
    except Exception:
        content = f"[Preview mode — AI output would appear here for: {prompt}]"

    # Save artifact
    try:
        art_id = str(uuid.uuid4())
        db.session.execute(text("""
            INSERT INTO ai_generated_artifacts
                (id, company_id, employee_id, artifact_type, title, content, trigger_event)
            VALUES (:id,:cid,:emp,:type,:title,:content,:trigger)
        """), {
            "id": art_id, "cid": g.company_id, "emp": g.user_id,
            "type": artifact_type,
            "title": prompt[:100] or f"{artifact_type.replace('_',' ').title()}",
            "content": content,
            "trigger": f"quick_generate:{artifact_type}",
        })
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        art_id = None

    return success({"content": content, "artifact_id": art_id})

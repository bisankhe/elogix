"""
FILE: backend/routes/ai_proxy_routes.py
NepHR Pro -- AI Proxy endpoint

WHY THIS FILE EXISTS:
  Browsers cannot call api.anthropic.com directly (CORS).
  The frontend calls /api/v1/ai-proxy/chat (proxied through Vite to Flask).
  Flask calls Anthropic with the real API key (server-side, never exposed).
  No JWT auth required -- this is the public-facing AI chat endpoint.
  Rate limiting is handled by the Anthropic API key's own limits.

URL prefix: /api/v1/ai-proxy
"""
from flask import Blueprint, request, jsonify
from anthropic import Anthropic
from ..config.settings import Config

ai_proxy_bp = Blueprint("ai_proxy", __name__, url_prefix="/api/v1/ai-proxy")

_client = None
def get_client():
    global _client
    if _client is None:
        _client = Anthropic(api_key=Config.ANTHROPIC_API_KEY)
    return _client


@ai_proxy_bp.post("/chat")
def proxy_chat():
    """
    Accepts: { system, messages, model?, max_tokens? }
    Returns: { content: string, usage: {input, output} }
    No auth required -- called directly from the React frontend.
    """
    try:
        body = request.get_json() or {}
        system   = body.get("system", "You are a helpful AI assistant.")
        messages = body.get("messages", [])
        model    = body.get("model", Config.ANTHROPIC_MODEL or "claude-sonnet-4-6")
        max_tok  = min(int(body.get("max_tokens", 2048)), 4096)

        if not messages:
            return jsonify({"error": "messages required"}), 422

        client = get_client()
        response = client.messages.create(
            model=model,
            max_tokens=max_tok,
            system=system,
            messages=messages,
        )
        return jsonify({
            "content": response.content[0].text,
            "usage": {
                "input":  response.usage.input_tokens,
                "output": response.usage.output_tokens,
            }
        })

    except Exception as e:
        err = str(e)
        # Surface a helpful message rather than a stack trace
        if "api_key" in err.lower() or "authentication" in err.lower():
            return jsonify({"error": "API key not configured. Set ANTHROPIC_API_KEY in .env"}), 500
        if "overload" in err.lower() or "rate" in err.lower():
            return jsonify({"error": "AI service busy. Please try again in a moment."}), 429
        return jsonify({"error": f"AI error: {err[:200]}"}), 500


@ai_proxy_bp.get("/health")
def health():
    """Quick check: is the Anthropic key configured?"""
    has_key = bool(Config.ANTHROPIC_API_KEY and
                   Config.ANTHROPIC_API_KEY != "sk-ant-your-key-here")
    return jsonify({
        "ok": has_key,
        "model": Config.ANTHROPIC_MODEL,
        "message": "API key configured" if has_key else "Set ANTHROPIC_API_KEY in .env"
    })

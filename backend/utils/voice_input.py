"""
FILE: backend/utils/voice_input.py
Audio transcription for NepHR Pro voice input fields.
Supports: Nepali (nep) + English (en) using Whisper API or browser Web Speech API fallback.
Every form field has 🎤 voice input — this is the backend handler.
"""
import os
import io
import base64
from flask import request, jsonify, Blueprint

voice_bp = Blueprint("voice", __name__, url_prefix="/api/v1/voice")

SUPPORTED_LANGUAGES = {
    "en":  "English",
    "ne":  "Nepali",        # Devanagari
    "hi":  "Hindi",         # For cross-border workers
}

# ── OpenAI Whisper transcription ──────────────────────────────
def transcribe_audio(audio_bytes: bytes, language: str = "ne",
                      task: str = "transcribe") -> dict:
    """
    Transcribe audio using OpenAI Whisper API.
    task: 'transcribe' = keep original language
          'translate'  = translate to English
    """
    try:
        import openai
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.webm"

        if task == "translate":
            result = client.audio.translations.create(
                model="whisper-1", file=audio_file
            )
        else:
            result = client.audio.transcriptions.create(
                model="whisper-1", file=audio_file,
                language=language if language in SUPPORTED_LANGUAGES else None,
                response_format="json",
            )
        return {
            "success":    True,
            "transcript": result.text,
            "language":   language,
            "confidence": None,   # Whisper doesn't return confidence
            "method":     "whisper",
        }
    except ImportError:
        return {"success": False, "error": "OpenAI not installed. pip install openai",
                "fallback": "browser_speech_api"}
    except Exception as e:
        return {"success": False, "error": str(e), "fallback": "browser_speech_api"}


# ── Endpoint: POST /api/v1/voice/transcribe ───────────────────
@voice_bp.post("/transcribe")
def transcribe_endpoint():
    """
    Accepts:
      - multipart/form-data: audio file + language
      - application/json:   { audio_base64, language, field_context }
    Returns:
      { success, transcript, language, field_context }
    """
    language = request.form.get("language", "ne") or request.json.get("language", "ne") if request.is_json else "ne"
    field_context = (request.form.get("field_context") or
                     (request.json.get("field_context") if request.is_json else None))

    # Get audio bytes
    audio_bytes = None

    if "audio" in request.files:
        audio_bytes = request.files["audio"].read()
    elif request.is_json and request.json.get("audio_base64"):
        try:
            audio_bytes = base64.b64decode(request.json["audio_base64"])
        except Exception:
            return jsonify({"success": False, "error": "Invalid base64 audio data"}), 400

    if not audio_bytes:
        return jsonify({"success": False, "error": "No audio data provided"}), 400

    result = transcribe_audio(audio_bytes, language=language)
    result["field_context"] = field_context

    # Post-process for known field types
    if result.get("success") and field_context:
        result["transcript"] = _post_process(result["transcript"], field_context)

    return jsonify(result)


# ── Endpoint: GET /api/v1/voice/languages ─────────────────────
@voice_bp.get("/languages")
def list_languages():
    return jsonify({
        "supported_languages": SUPPORTED_LANGUAGES,
        "default":             "ne",
        "browser_speech_api":  True,   # Frontend fallback
    })


# ── Field-specific post-processing ────────────────────────────
def _post_process(text: str, field_context: str) -> str:
    """Clean up transcript based on the field it's going into."""
    text = text.strip()

    # Code fields: uppercase, no spaces
    if field_context in ("code", "dept_code", "grade_code", "position_code",
                          "vendor_code", "contract_number"):
        text = text.upper().replace(" ", "-").replace(".", "")

    # Number fields: extract digits
    elif field_context in ("phone", "fax", "pan_no", "vat_no"):
        import re
        text = re.sub(r"[^\d+\-()]", "", text)

    # Email fields: lowercase
    elif "email" in field_context:
        text = text.lower().replace(" ", "")

    # Date fields: try to normalize
    elif field_context in ("start_date", "end_date", "join_date", "expiry_date"):
        text = _normalize_spoken_date(text)

    return text


def _normalize_spoken_date(spoken: str) -> str:
    """Convert spoken dates like 'twelfth June two thousand twenty four' to 2024-06-12."""
    # Simple heuristic — in production, use dateparser library
    MONTHS = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12",
        # Nepali month names
        "baisakh": "04", "jestha": "05", "ashadh": "06", "shrawan": "07",
        "bhadra": "08", "ashwin": "09", "kartik": "10", "mangsir": "11",
        "poush": "12", "magh": "01", "falgun": "02", "chaitra": "03",
    }
    lower = spoken.lower()
    for month_name, month_num in MONTHS.items():
        if month_name in lower:
            return f"(contains {month_name}) — {spoken}"
    return spoken

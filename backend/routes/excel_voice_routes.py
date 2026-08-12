"""
FILE: backend/routes/excel_voice_routes.py
SAP-style Excel Import/Export + Voice Input endpoints.
URL prefix: /api/v1/tools
Available for every page in eLogix HRMS.
"""
from flask import Blueprint, request, jsonify, g, send_file
import io

from ..middleware.auth import require_auth
from ..utils.excel_import import parse_excel_upload, build_template_xlsx, IMPORT_TEMPLATES
from ..utils.voice_input import transcribe_audio, SUPPORTED_LANGUAGES
from ..utils.pagination import success, error

tools_bp = Blueprint("tools", __name__, url_prefix="/api/v1/tools")

# ── Excel Import ──────────────────────────────────────────────
@tools_bp.post("/excel/import/<module>")
@require_auth
def import_excel(module):
    """
    POST /api/v1/tools/excel/import/<module>
    Accepts multipart/form-data with 'file' field (.xlsx or .csv).
    Validates against module template + Nepal Labour Act 2074 rules.
    Supported modules: see IMPORT_TEMPLATES keys.
    """
    if module not in IMPORT_TEMPLATES:
        return error(
            f"Unknown module '{module}'. Supported: {', '.join(IMPORT_TEMPLATES.keys())}",
            400
        )
    if "file" not in request.files:
        return error("No file provided. Send file in 'file' form field.", 400)

    file = request.files["file"]
    if not file.filename:
        return error("Empty filename", 400)

    result = parse_excel_upload(file, module)

    if result.get("success"):
        return jsonify({**result, "status": "ready_to_import"}), 200
    else:
        return jsonify({**result, "status": "validation_failed"}), 422


@tools_bp.get("/excel/template/<module>")
@require_auth
def download_template(module):
    """
    GET /api/v1/tools/excel/template/<module>
    Download a pre-filled Excel template with sample data and instructions.
    """
    if module not in IMPORT_TEMPLATES:
        return error(f"Unknown module '{module}'", 404)

    xlsx_bytes = build_template_xlsx(module)
    if not xlsx_bytes:
        # Fallback: return template info as JSON if openpyxl not available
        return success({
            "module": module,
            "template": IMPORT_TEMPLATES[module],
            "note": "Install openpyxl to download .xlsx: pip install openpyxl"
        })

    return send_file(
        io.BytesIO(xlsx_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f"elogix_hrms_{module}_import_template.xlsx"
    )


@tools_bp.get("/excel/modules")
@require_auth
def list_import_modules():
    """GET /api/v1/tools/excel/modules — List all modules with Excel import support."""
    return success({
        module: {
            "required_columns": tmpl["required"],
            "optional_columns": tmpl["optional"],
            "notes":            tmpl.get("validation_notes", ""),
            "template_url":     f"/api/v1/tools/excel/template/{module}",
            "import_url":       f"/api/v1/tools/excel/import/{module}",
        }
        for module, tmpl in IMPORT_TEMPLATES.items()
    })


# ── Voice Input ───────────────────────────────────────────────
@tools_bp.post("/voice/transcribe")
@require_auth
def voice_transcribe():
    """
    POST /api/v1/tools/voice/transcribe
    Accepts:
      Option A: multipart/form-data with 'audio' file + 'language' + 'field_context'
      Option B: JSON { audio_base64, language, field_context }
    Returns: { success, transcript, language, field_context }
    """
    import base64
    language      = "ne"
    field_context = None
    audio_bytes   = None

    if request.content_type and "multipart" in request.content_type:
        language      = request.form.get("language", "ne")
        field_context = request.form.get("field_context")
        if "audio" in request.files:
            audio_bytes = request.files["audio"].read()
    else:
        body = request.get_json() or {}
        language      = body.get("language", "ne")
        field_context = body.get("field_context")
        if body.get("audio_base64"):
            try:
                audio_bytes = base64.b64decode(body["audio_base64"])
            except Exception:
                return error("Invalid base64 audio data", 400)

    if not audio_bytes:
        return error("No audio data. Send file in 'audio' field or audio_base64 in JSON.", 400)

    result = transcribe_audio(audio_bytes, language=language)
    result["field_context"] = field_context

    if not result.get("success"):
        # Return browser-fallback hint
        result["browser_fallback"] = True
        result["hint"] = (
            "Backend transcription unavailable. "
            "Use browser Web Speech API (window.SpeechRecognition) as fallback. "
            "Already implemented in eLogix HRMS frontend."
        )
    return jsonify(result), 200 if result.get("success") else 206


@tools_bp.get("/voice/languages")
def voice_languages():
    """GET /api/v1/tools/voice/languages — Supported transcription languages."""
    return success({
        "languages":    SUPPORTED_LANGUAGES,
        "default":      "ne",
        "browser_api":  True,
        "note": "Browser Web Speech API is primary (no backend needed for common browsers). "
                "Backend Whisper API used as enhanced fallback for Nepali."
    })

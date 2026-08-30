"""
FILE: backend/utils/pagination.py
Shared pagination, filtering, and sorting utilities for all API routes.
Consistent response format across all 22+ modules.
"""
from flask import request
from sqlalchemy.orm import Query
from sqlalchemy import asc, desc, or_, and_
from typing import Any

# ── Default constants ─────────────────────────────────────────
DEFAULT_PAGE     = 1
DEFAULT_PER_PAGE = 20
MAX_PER_PAGE     = 100

# ── Core paginator ────────────────────────────────────────────
def paginate(query: Query, page: int = None, per_page: int = None) -> tuple[list, dict]:
    """
    Paginate a SQLAlchemy query.
    Returns: (items, meta)
    meta = {total, page, per_page, total_pages, has_next, has_prev}
    """
    page     = max(int(page or request.args.get("page", DEFAULT_PAGE)), 1)
    per_page = min(int(per_page or request.args.get("per_page", DEFAULT_PAGE)), MAX_PER_PAGE)
    per_page = max(per_page, 1)

    total  = query.count()
    items  = query.offset((page - 1) * per_page).limit(per_page).all()
    total_pages = max((total + per_page - 1) // per_page, 1)

    return items, {
        "total":       total,
        "page":        page,
        "per_page":    per_page,
        "total_pages": total_pages,
        "has_next":    page < total_pages,
        "has_prev":    page > 1,
        "next_page":   page + 1 if page < total_pages else None,
        "prev_page":   page - 1 if page > 1 else None,
    }

# ── Standard API response builders ───────────────────────────
def success(data: Any, status: int = 200, meta: dict = None,
             message: str = None) -> tuple:
    resp = {"success": True, "data": data}
    if meta:    resp["meta"]    = meta
    if message: resp["message"] = message
    from flask import jsonify
    return jsonify(resp), status

def error(message: str, status: int = 400, details: Any = None,
           code: str = None) -> tuple:
    resp = {"success": False, "error": message}
    if details: resp["details"] = details
    if code:    resp["code"]    = code
    from flask import jsonify
    return jsonify(resp), status

def created(data: Any, message: str = "Record created successfully") -> tuple:
    return success(data, status=201, message=message)

def not_found(resource: str = "Record") -> tuple:
    return error(f"{resource} not found", status=404, code="NOT_FOUND")

def validation_error(errors: list) -> tuple:
    return error("Validation failed", status=422, details=errors, code="VALIDATION_ERROR")

# ── Search & filter helpers ───────────────────────────────────
def apply_search(query: Query, model, fields: list[str], search_term: str = None) -> Query:
    """Apply full-text OR search across given fields."""
    if not search_term:
        search_term = request.args.get("search", "").strip()
    if not search_term:
        return query

    conditions = []
    for field in fields:
        col = getattr(model, field, None)
        if col is not None:
            conditions.append(col.ilike(f"%{search_term}%"))
    if conditions:
        query = query.filter(or_(*conditions))
    return query

def apply_sort(query: Query, model, allowed_sorts: list[str] = None) -> Query:
    """Apply sort from ?sort=field&order=asc|desc query params."""
    sort_field = request.args.get("sort", "created_at")
    sort_order = request.args.get("order", "desc").lower()

    if allowed_sorts and sort_field not in allowed_sorts:
        sort_field = "created_at"

    col = getattr(model, sort_field, None)
    if col is None:
        col = getattr(model, "created_at", None)

    if col is not None:
        query = query.order_by(desc(col) if sort_order == "desc" else asc(col))
    return query

def apply_status_filter(query: Query, model) -> Query:
    """Filter by status from ?status= query param."""
    status = request.args.get("status")
    if status and hasattr(model, "status"):
        query = query.filter(model.status == status)
    return query

def apply_date_range(query: Query, model, date_field: str = "created_at") -> Query:
    """Filter by ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD."""
    from datetime import datetime
    col = getattr(model, date_field, None)
    if col is None:
        return query
    date_from = request.args.get("date_from")
    date_to   = request.args.get("date_to")
    if date_from:
        try:
            query = query.filter(col >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            query = query.filter(col <= datetime.fromisoformat(date_to))
        except ValueError:
            pass
    return query

# ── Quick filter from request args ───────────────────────────
def apply_filters(query: Query, model, filterable_fields: list[str]) -> Query:
    """Auto-apply exact-match filters from query params for listed fields."""
    for field in filterable_fields:
        val = request.args.get(field)
        col = getattr(model, field, None)
        if val is not None and col is not None:
            query = query.filter(col == val)
    return query

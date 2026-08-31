# FILE: backend/utils/validators.py
# eLogix HRMS — Request Validation & Sanitization
# Validates and sanitizes all incoming API requests
# Nepal Labour Act 2074 compliance helpers included
# eLogix Technologies · www.elogix.com.np

import re
from datetime import date, datetime
from functools import wraps
from flask import request, jsonify, g
import logging

logger = logging.getLogger('elogix.validators')


# ══════════════════════════════════════════════════════════════════════
# INPUT SANITIZATION
# ══════════════════════════════════════════════════════════════════════

def sanitize_string(value: str, max_length: int = 500) -> str:
    """Strip dangerous characters, limit length."""
    if not isinstance(value, str):
        return ''
    # Remove null bytes and control characters (except newline/tab)
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)
    # Strip leading/trailing whitespace
    value = value.strip()
    # Enforce max length
    return value[:max_length]


def sanitize_email(email: str) -> str:
    """Normalize and validate email."""
    if not isinstance(email, str):
        return ''
    email = email.strip().lower()
    if not re.match(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$', email):
        return ''
    return email


def sanitize_phone(phone: str) -> str:
    """Normalize Nepali phone numbers."""
    if not isinstance(phone, str):
        return ''
    digits = re.sub(r'[^\d+]', '', phone)
    # Accept +977XXXXXXXXXX or 98XXXXXXXX or 97XXXXXXXX
    if re.match(r'^(\+977)?[9][678]\d{8}$', digits.replace('+977', '')):
        return digits
    return phone.strip()[:20]


def sanitize_slug(slug: str) -> str:
    """Create URL-safe slug for tenant subdomains."""
    if not isinstance(slug, str):
        return ''
    slug = slug.strip().lower()
    slug = re.sub(r'[^a-z0-9\-]', '', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug[:50]


# ══════════════════════════════════════════════════════════════════════
# FIELD VALIDATORS
# ══════════════════════════════════════════════════════════════════════

class ValidationError(Exception):
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field   = field
        super().__init__(message)


def validate_required(data: dict, fields: list) -> list:
    """Return list of missing required fields."""
    missing = []
    for field in fields:
        val = data.get(field)
        if val is None or (isinstance(val, str) and not val.strip()):
            missing.append(field)
    return missing


def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, str(email or '')))


def validate_phone_np(phone: str) -> bool:
    """Validate Nepali mobile number."""
    digits = re.sub(r'[\s\-\+]', '', str(phone or ''))
    if digits.startswith('977'): digits = digits[3:]
    return bool(re.match(r'^[9][678]\d{8}$', digits))


def validate_pan_np(pan: str) -> bool:
    """Validate Nepal PAN (9 digits)."""
    return bool(re.match(r'^\d{9}$', str(pan or '').strip()))


def validate_citizenship_np(cit: str) -> bool:
    """Validate Nepal Citizenship number pattern."""
    return bool(re.match(r'^[\d\-/]+$', str(cit or '').strip()) and len(str(cit)) >= 8)


def validate_date(value: str, fmt: str = '%Y-%m-%d') -> bool:
    try:
        datetime.strptime(value, fmt)
        return True
    except (ValueError, TypeError):
        return False


def validate_positive_number(value) -> bool:
    try:
        return float(value) > 0
    except (TypeError, ValueError):
        return False


def validate_percentage(value) -> bool:
    try:
        return 0 <= float(value) <= 100
    except (TypeError, ValueError):
        return False


# ══════════════════════════════════════════════════════════════════════
# REQUEST VALIDATION DECORATOR
# ══════════════════════════════════════════════════════════════════════

def validate_json(*required_fields):
    """
    Decorator: validates JSON body, checks required fields.
    Usage:
        @validate_json('name', 'email', 'slug')
        def create_company():
            data = g.validated_data
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Request must be JSON', 'code': 'NOT_JSON'}), 400

            try:
                data = request.get_json(force=True)
            except Exception:
                return jsonify({'error': 'Invalid JSON body', 'code': 'INVALID_JSON'}), 400

            if not isinstance(data, dict):
                return jsonify({'error': 'Request body must be a JSON object'}), 400

            # Check required fields
            missing = validate_required(data, required_fields)
            if missing:
                return jsonify({
                    'error'  : f"Missing required fields: {', '.join(missing)}",
                    'code'   : 'MISSING_FIELDS',
                    'fields' : missing,
                }), 422

            # Auto-sanitize string fields
            sanitized = {}
            for key, val in data.items():
                if isinstance(val, str):
                    sanitized[key] = sanitize_string(val)
                else:
                    sanitized[key] = val

            g.validated_data = sanitized
            return f(*args, **kwargs)
        return decorated
    return decorator


def validate_pagination():
    """
    Decorator: extracts and validates page/per_page query params.
    Sets g.page, g.per_page on the request context.
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            try:
                page     = max(1, int(request.args.get('page', 1)))
                per_page = min(200, max(1, int(request.args.get('per_page', 20))))
            except (ValueError, TypeError):
                page, per_page = 1, 20

            g.page     = page
            g.per_page = per_page
            g.offset   = (page - 1) * per_page
            return f(*args, **kwargs)
        return decorated
    return decorator


# ══════════════════════════════════════════════════════════════════════
# NEPAL LABOUR ACT 2074 COMPLIANCE VALIDATORS
# ══════════════════════════════════════════════════════════════════════

def validate_working_hours(hours_per_day: float) -> tuple:
    """
    Nepal Labour Act 2074:
    - Standard: 8 hrs/day, 48 hrs/week
    - Max OT: 4 hrs/day, 24 hrs/week
    Returns (is_valid, message)
    """
    if hours_per_day <= 0:
        return False, "Working hours must be positive"
    if hours_per_day > 12:
        return False, "Cannot exceed 12 hours/day (Labour Act 2074, Section 28)"
    if hours_per_day > 8:
        ot = hours_per_day - 8
        if ot > 4:
            return False, "Overtime cannot exceed 4 hours/day (Labour Act 2074)"
    return True, "Valid"


def validate_minimum_wage_np(salary: float, effective_date: date = None) -> tuple:
    """
    Nepal minimum wage validation.
    Current minimum wage: NPR 17,300/month (effective Oct 2023).
    """
    MIN_WAGE = 17300  # Update when government revises
    if salary < MIN_WAGE:
        return False, f"Salary NPR {salary:,.0f} is below minimum wage NPR {MIN_WAGE:,}/month (Nepal Labour Act 2074)"
    return True, "Valid"


def validate_leave_entitlement(leave_type: str, days: float, employment_years: float) -> tuple:
    """
    Nepal Labour Act 2074 leave entitlements:
    - Home leave: 13 days/year (after 1 year service)
    - Sick leave: 12 days/year
    - Maternity: 98 days
    - Mourning: 13 days
    - Public holidays: As declared by government
    """
    ENTITLEMENTS = {
        'home'      : 13,
        'sick'      : 12,
        'maternity' : 98,
        'paternity' : 15,
        'mourning'  : 13,
    }
    if leave_type.lower() in ENTITLEMENTS:
        max_days = ENTITLEMENTS[leave_type.lower()]
        if days > max_days:
            return False, f"{leave_type.title()} leave exceeds Labour Act 2074 entitlement of {max_days} days"
    return True, "Valid"


def validate_gratuity_np(monthly_salary: float, years_of_service: float) -> float:
    """
    Calculate gratuity per Nepal Labour Act 2074:
    - 8.33% of monthly salary per year of service (1 month salary per year)
    - Minimum 1 year service required
    """
    if years_of_service < 1:
        return 0
    return monthly_salary * years_of_service


# ══════════════════════════════════════════════════════════════════════
# RESPONSE HELPERS
# ══════════════════════════════════════════════════════════════════════

def paginate_response(query, schema_fn=None):
    """
    Paginate a SQLAlchemy query.
    Uses g.page and g.per_page set by @validate_pagination.
    Returns a standardized response dict.
    """
    page     = getattr(g, 'page', 1)
    per_page = getattr(g, 'per_page', 20)

    total    = query.count()
    items    = query.limit(per_page).offset((page - 1) * per_page).all()

    data = [schema_fn(item) for item in items] if schema_fn else items

    return {
        'data'        : data,
        'pagination'  : {
            'page'       : page,
            'per_page'   : per_page,
            'total'      : total,
            'total_pages': (total + per_page - 1) // per_page,
            'has_next'   : page * per_page < total,
            'has_prev'   : page > 1,
        }
    }


def success_response(data=None, message: str = None, status: int = 200):
    resp = {'success': True}
    if message: resp['message'] = message
    if data is not None: resp['data'] = data
    return jsonify(resp), status


def error_response(message: str, code: str = 'ERROR', status: int = 400, details=None):
    resp = {'success': False, 'error': message, 'code': code}
    if details: resp['details'] = details
    return jsonify(resp), status

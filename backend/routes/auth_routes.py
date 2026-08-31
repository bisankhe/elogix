# FILE: backend/routes/auth_routes.py
# eLogix HRMS — Authentication API Routes
# Login, Register, JWT refresh, Logout, Password reset
# Tenant-aware: every user belongs to a company (company_id)
# eLogix Technologies · www.elogix.com.np

import os
import jwt
import bcrypt
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from backend.extensions import db

logger = logging.getLogger('elogix.auth')
auth_bp = Blueprint('auth', __name__)

SECRET_KEY      = os.getenv('JWT_SECRET_KEY', os.getenv('SECRET_KEY', 'elogix-secret'))
ACCESS_HOURS    = int(os.getenv('JWT_ACCESS_HOURS', '8'))
REFRESH_DAYS    = int(os.getenv('JWT_REFRESH_DAYS', '30'))
MAX_ATTEMPTS    = 5
LOCKOUT_MINUTES = 15


# ── JWT helpers ────────────────────────────────────────────────────────

def make_access_token(user_id: int, company_id: int, role: str, slug: str) -> str:
    payload = {
        'user_id'   : user_id,
        'company_id': company_id,
        'role'      : role,
        'slug'      : slug,
        'type'      : 'access',
        'exp'       : datetime.now(timezone.utc) + timedelta(hours=ACCESS_HOURS),
        'iat'       : datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def make_refresh_token(user_id: int, company_id: int) -> str:
    payload = {
        'user_id'   : user_id,
        'company_id': company_id,
        'type'      : 'refresh',
        'exp'       : datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        'iat'       : datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


# ── require_auth decorator ─────────────────────────────────────────────

def require_auth(f):
    """Validates JWT and sets g.user_id, g.company_id, g.role, g.tenant_slug."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization token required', 'code': 'NO_TOKEN'}), 401

        token = auth_header[7:]
        try:
            payload = decode_token(token)
            if payload.get('type') != 'access':
                return jsonify({'error': 'Invalid token type', 'code': 'INVALID_TOKEN'}), 401

            g.user_id    = payload['user_id']
            g.company_id = payload['company_id']
            g.role       = payload.get('role', 'employee')
            g.tenant_slug = payload.get('slug', '')

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired. Please log in again.', 'code': 'TOKEN_EXPIRED'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': f'Invalid token: {str(e)}', 'code': 'INVALID_TOKEN'}), 401

        return f(*args, **kwargs)
    return decorated


# ══════════════════════════════════════════════════════════════════════
# POST /api/v1/auth/login
# ══════════════════════════════════════════════════════════════════════

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email    = (data.get('email', '') or '').strip().lower()
    password = data.get('password', '') or ''
    slug     = (data.get('slug', '') or request.headers.get('X-Tenant-Slug', '')).strip().lower()

    if not email or not password:
        return jsonify({'error': 'Email and password are required', 'code': 'MISSING_FIELDS'}), 400

    try:
        # Build query — with or without slug (eLogix SuperAdmin has no slug)
        if slug:
            row = db.session.execute(text("""
                SELECT u.id, u.email, u.password_hash, u.role, u.is_active,
                       u.failed_attempts, u.locked_until, u.company_id,
                       tc.slug, tc.name AS company_name, tc.plan, tc.status AS company_status,
                       e.id AS employee_id, e.full_name
                FROM users u
                JOIN tenant_companies tc ON tc.id = u.company_id
                LEFT JOIN employees e ON e.user_id = u.id
                WHERE LOWER(u.email) = :email AND tc.slug = :slug
                LIMIT 1
            """), {'email': email, 'slug': slug}).fetchone()
        else:
            # eLogix superadmin login (no company slug)
            row = db.session.execute(text("""
                SELECT u.id, u.email, u.password_hash, u.role, u.is_active,
                       u.failed_attempts, u.locked_until, u.company_id,
                       '' AS slug, 'eLogix Technologies' AS company_name,
                       'enterprise' AS plan, 'active' AS company_status,
                       NULL AS employee_id, u.email AS full_name
                FROM users u
                WHERE LOWER(u.email) = :email AND u.company_id IS NULL
                LIMIT 1
            """), {'email': email}).fetchone()

        if not row:
            logger.warning(f'Login failed — user not found: {email} slug={slug}')
            return jsonify({'error': 'Invalid email or password', 'code': 'INVALID_CREDENTIALS'}), 401

        # Check account lock
        if row.locked_until and datetime.now(timezone.utc) < row.locked_until.replace(tzinfo=timezone.utc):
            mins = int((row.locked_until.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).seconds / 60)
            return jsonify({
                'error': f'Account locked. Try again in {mins} minutes.',
                'code' : 'ACCOUNT_LOCKED'
            }), 429

        if not row.is_active:
            return jsonify({'error': 'Account is disabled. Contact HR.', 'code': 'ACCOUNT_INACTIVE'}), 401

        if row.company_status not in ('active', 'trial'):
            return jsonify({
                'error': f'Company account is {row.company_status}. Contact support@elogix.com.np',
                'code' : 'COMPANY_INACTIVE'
            }), 403

        # Verify password
        if not check_password(password, row.password_hash):
            # Increment failed attempts
            new_attempts = (row.failed_attempts or 0) + 1
            lock_until   = None
            if new_attempts >= MAX_ATTEMPTS:
                lock_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
                logger.warning(f'Account locked after {MAX_ATTEMPTS} failed attempts: {email}')

            db.session.execute(text("""
                UPDATE users SET failed_attempts=:att, locked_until=:lock, updated_at=NOW()
                WHERE id=:uid
            """), {'att': new_attempts, 'lock': lock_until, 'uid': row.id})
            db.session.commit()

            return jsonify({'error': 'Invalid email or password', 'code': 'INVALID_CREDENTIALS'}), 401

        # ✅ Successful login — reset attempts, update last_login
        access_token  = make_access_token(row.id, row.company_id, row.role, row.slug)
        refresh_token = make_refresh_token(row.id, row.company_id)

        db.session.execute(text("""
            UPDATE users
            SET failed_attempts=0, locked_until=NULL,
                last_login_at=NOW(), last_login_ip=:ip,
                refresh_token=:rt, updated_at=NOW()
            WHERE id=:uid
        """), {'ip': request.remote_addr, 'rt': refresh_token, 'uid': row.id})
        db.session.commit()

        logger.info(f'Login success: {email} company={row.slug} role={row.role}')

        return jsonify({
            'success'      : True,
            'access_token' : access_token,
            'refresh_token': refresh_token,
            'token_type'   : 'Bearer',
            'expires_in'   : ACCESS_HOURS * 3600,
            'user': {
                'id'         : row.id,
                'email'      : row.email,
                'full_name'  : row.full_name,
                'role'       : row.role,
                'employee_id': row.employee_id,
            },
            'company': {
                'id'  : row.company_id,
                'slug': row.slug,
                'name': row.company_name,
                'plan': row.plan,
            },
        })

    except Exception as e:
        logger.error(f'Login error: {e}', exc_info=True)
        return jsonify({'error': 'Login failed. Please try again.', 'code': 'SERVER_ERROR'}), 500


# ══════════════════════════════════════════════════════════════════════
# POST /api/v1/auth/register (Tenant company self-registration)
# ══════════════════════════════════════════════════════════════════════

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}

    company_name = (data.get('company_name') or data.get('name') or '').strip()
    slug         = (data.get('slug') or '').strip().lower()
    plan         = (data.get('plan') or 'trial').lower()
    admin_email  = (data.get('admin_email') or data.get('email') or '').strip().lower()
    admin_name   = (data.get('admin_name') or '').strip()
    password     = data.get('password') or data.get('admin_password') or ''
    business_type= (data.get('business_type') or 'custom').strip()
    phone        = (data.get('phone') or '').strip()
    country      = (data.get('country') or 'Nepal').strip()
    currency     = (data.get('currency') or 'NPR').strip()
    industry     = (data.get('industry') or data.get('business_label') or business_type).strip()

    # Validate required fields
    missing = [f for f in ['company_name', 'slug', 'admin_email'] if not data.get(f) and not locals().get(f)]
    if not company_name: missing.append('company_name')
    if not slug:         missing.append('slug')
    if not admin_email:  missing.append('admin_email')

    if missing:
        return jsonify({'error': f"Missing: {', '.join(missing)}", 'code': 'MISSING_FIELDS'}), 400

    if len(slug) < 3 or not slug.replace('-', '').isalnum():
        return jsonify({'error': 'Slug must be 3+ alphanumeric characters', 'code': 'INVALID_SLUG'}), 400

    # Default password = admin_email if not provided
    if not password:
        password = admin_email

    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters', 'code': 'WEAK_PASSWORD'}), 400

    try:
        # Check slug availability
        existing = db.session.execute(
            text("SELECT id FROM tenant_companies WHERE slug=:slug"),
            {'slug': slug}
        ).fetchone()
        if existing:
            return jsonify({
                'success': False,
                'error'  : f'"{slug}.elogix.com.np" is already taken. Choose a different company name.',
                'code'   : 'SLUG_TAKEN'
            }), 409

        # Check email not already registered
        existing_email = db.session.execute(
            text("SELECT u.id FROM users u JOIN tenant_companies tc ON tc.id=u.company_id WHERE LOWER(u.email)=:email AND tc.slug=:slug"),
            {'email': admin_email, 'slug': slug}
        ).fetchone()
        if existing_email:
            return jsonify({'error': 'This email is already registered', 'code': 'EMAIL_EXISTS'}), 409

        # Create company (status=pending — needs SuperAdmin approval)
        result = db.session.execute(text("""
            INSERT INTO tenant_companies (
                slug, name, plan, business_type, industry,
                admin_email, admin_name, phone, country, currency, status,
                created_at, updated_at
            ) VALUES (
                :slug, :name, :plan, :business_type, :industry,
                :admin_email, :admin_name, :phone, :country, :currency, 'pending',
                NOW(), NOW()
            ) RETURNING id
        """), {
            'slug': slug, 'name': company_name, 'plan': plan,
            'business_type': business_type, 'industry': industry,
            'admin_email': admin_email, 'admin_name': admin_name,
            'phone': phone, 'country': country, 'currency': currency,
        })
        company_id = result.fetchone().id

        # Create admin user for this company
        password_hash = hash_password(password)
        db.session.execute(text("""
            INSERT INTO users (
                company_id, email, password_hash, role,
                is_active, is_verified, created_at, updated_at
            ) VALUES (
                :cid, :email, :pw_hash, 'super_admin',
                TRUE, TRUE, NOW(), NOW()
            )
        """), {'cid': company_id, 'email': admin_email, 'pw_hash': password_hash})

        db.session.commit()

        logger.info(f'New registration: {slug} ({company_name}) by {admin_email}')

        return jsonify({
            'success'     : True,
            'message'     : 'Registration complete! Awaiting eLogix SuperAdmin approval within 24 hours.',
            'portal_url'  : f'https://{slug}.elogix.com.np',
            'company_name': company_name,
            'plan'        : plan,
            'status'      : 'pending',
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f'Registration error: {e}', exc_info=True)
        return jsonify({'error': 'Registration failed. Please try again.', 'code': 'SERVER_ERROR'}), 500


# ══════════════════════════════════════════════════════════════════════
# POST /api/v1/auth/refresh
# ══════════════════════════════════════════════════════════════════════

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    data          = request.get_json() or {}
    refresh_token = data.get('refresh_token') or request.headers.get('X-Refresh-Token', '')

    if not refresh_token:
        return jsonify({'error': 'Refresh token required', 'code': 'NO_REFRESH_TOKEN'}), 400

    try:
        payload = decode_token(refresh_token)
        if payload.get('type') != 'refresh':
            return jsonify({'error': 'Invalid token type', 'code': 'INVALID_TOKEN'}), 401

        user_id    = payload['user_id']
        company_id = payload['company_id']

        # Verify token matches stored token
        row = db.session.execute(text("""
            SELECT u.id, u.role, u.is_active, u.refresh_token,
                   tc.slug, tc.status AS company_status
            FROM users u
            LEFT JOIN tenant_companies tc ON tc.id=u.company_id
            WHERE u.id=:uid AND u.company_id=:cid
        """), {'uid': user_id, 'cid': company_id}).fetchone()

        if not row or not row.is_active:
            return jsonify({'error': 'User not found or inactive', 'code': 'INVALID_USER'}), 401

        if row.refresh_token != refresh_token:
            return jsonify({'error': 'Refresh token mismatch', 'code': 'TOKEN_REUSE'}), 401

        if row.company_status not in ('active', 'trial', None):
            return jsonify({'error': 'Company account inactive', 'code': 'COMPANY_INACTIVE'}), 403

        # Issue new tokens
        new_access  = make_access_token(user_id, company_id, row.role, row.slug or '')
        new_refresh = make_refresh_token(user_id, company_id)

        db.session.execute(text(
            "UPDATE users SET refresh_token=:rt, updated_at=NOW() WHERE id=:uid"
        ), {'rt': new_refresh, 'uid': user_id})
        db.session.commit()

        return jsonify({
            'success'      : True,
            'access_token' : new_access,
            'refresh_token': new_refresh,
            'token_type'   : 'Bearer',
            'expires_in'   : ACCESS_HOURS * 3600,
        })

    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Refresh token expired. Please log in again.', 'code': 'REFRESH_EXPIRED'}), 401
    except Exception as e:
        logger.error(f'Refresh error: {e}', exc_info=True)
        return jsonify({'error': 'Token refresh failed', 'code': 'SERVER_ERROR'}), 500


# ══════════════════════════════════════════════════════════════════════
# POST /api/v1/auth/logout
# ══════════════════════════════════════════════════════════════════════

@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    try:
        db.session.execute(
            text("UPDATE users SET refresh_token=NULL, updated_at=NOW() WHERE id=:uid"),
            {'uid': g.user_id}
        )
        db.session.commit()
        logger.info(f'Logout: user_id={g.user_id}')
        return jsonify({'success': True, 'message': 'Logged out successfully'})
    except Exception as e:
        logger.error(f'Logout error: {e}')
        return jsonify({'success': True})  # Always return success on logout


# ══════════════════════════════════════════════════════════════════════
# GET /api/v1/auth/me
# ══════════════════════════════════════════════════════════════════════

@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    try:
        row = db.session.execute(text("""
            SELECT u.id, u.email, u.role, u.created_at,
                   e.full_name, e.employee_code, e.photo_url, e.id AS employee_id,
                   d.name AS department, des.title AS designation,
                   tc.id AS company_id, tc.slug, tc.name AS company_name,
                   tc.plan, tc.status AS company_status, tc.logo_url
            FROM users u
            LEFT JOIN employees e ON e.user_id=u.id AND e.company_id=:cid
            LEFT JOIN departments d ON d.id=e.department_id
            LEFT JOIN designations des ON des.id=e.designation_id
            LEFT JOIN tenant_companies tc ON tc.id=u.company_id
            WHERE u.id=:uid
        """), {'uid': g.user_id, 'cid': g.company_id}).fetchone()

        if not row:
            return jsonify({'error': 'User not found', 'code': 'NOT_FOUND'}), 404

        return jsonify({
            'success': True,
            'user': {
                'id'         : row.id,
                'email'      : row.email,
                'role'       : row.role,
                'full_name'  : row.full_name or row.email,
                'employee_id': row.employee_id,
                'employee_code': row.employee_code,
                'photo_url'  : row.photo_url,
                'department' : row.department,
                'designation': row.designation,
            },
            'company': {
                'id'    : row.company_id,
                'slug'  : row.slug,
                'name'  : row.company_name,
                'plan'  : row.plan,
                'status': row.company_status,
                'logo'  : row.logo_url,
            },
        })
    except Exception as e:
        logger.error(f'/me error: {e}', exc_info=True)
        return jsonify({'error': 'Failed to load profile', 'code': 'SERVER_ERROR'}), 500


# ══════════════════════════════════════════════════════════════════════
# POST /api/v1/auth/change-password
# ══════════════════════════════════════════════════════════════════════

@auth_bp.route('/change-password', methods=['POST'])
@require_auth
def change_password():
    data         = request.get_json() or {}
    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')

    if not old_password or not new_password:
        return jsonify({'error': 'Both old and new password required'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    try:
        row = db.session.execute(
            text("SELECT password_hash FROM users WHERE id=:uid"),
            {'uid': g.user_id}
        ).fetchone()

        if not row or not check_password(old_password, row.password_hash):
            return jsonify({'error': 'Current password is incorrect', 'code': 'WRONG_PASSWORD'}), 400

        new_hash = hash_password(new_password)
        db.session.execute(text("""
            UPDATE users SET password_hash=:pw, refresh_token=NULL, updated_at=NOW()
            WHERE id=:uid
        """), {'pw': new_hash, 'uid': g.user_id})
        db.session.commit()

        logger.info(f'Password changed: user_id={g.user_id}')
        return jsonify({'success': True, 'message': 'Password changed successfully'})

    except Exception as e:
        logger.error(f'Change password error: {e}', exc_info=True)
        return jsonify({'error': 'Failed to change password', 'code': 'SERVER_ERROR'}), 500

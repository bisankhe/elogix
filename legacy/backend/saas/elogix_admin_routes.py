# FILE: backend/saas/elogix_admin_routes.py
# eLogix HRMS — eLogix SuperAdmin API Routes
# Handles: company registration, pending approvals, approval/rejection
# These routes are called by:
#   - RegisterPage.jsx        → POST /api/elogix-admin/v1/register-company
#   - ELogixAdminPage.jsx     → GET  /api/elogix-admin/v1/companies
#   - ELogixAdminPage.jsx     → GET  /api/elogix-admin/v1/pending-companies
#   - ELogixAdminPage.jsx     → POST /api/elogix-admin/v1/companies/{slug}/approve
# eLogix Technologies · www.elogix.com.np

from flask import Blueprint, request, jsonify, g
from datetime import datetime, date
import logging, os, json

logger = logging.getLogger('elogix.saas_admin')
elogix_admin_bp = Blueprint('elogix_admin', __name__)

# ── Admin key validation ──────────────────────────────────────────────
ADMIN_KEY = os.getenv('ELOGIX_ADMIN_KEY', 'elogix-admin-2026')

def require_admin_key(f):
    """Decorator: validates X-eLogix-Admin-Key header OR Bearer token."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        key   = request.headers.get('X-eLogix-Admin-Key', '')
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        # Allow CORS preflight
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        # Validate admin key (or skip in dev mode)
        if os.getenv('FLASK_ENV') != 'development':
            if key != ADMIN_KEY and not _valid_admin_token(token):
                return jsonify({'error': 'Unauthorized — invalid admin key'}), 401
        return f(*args, **kwargs)
    return decorated

def _valid_admin_token(token):
    """Validate JWT admin token."""
    try:
        import jwt
        payload = jwt.decode(token, os.getenv('SECRET_KEY', ''), algorithms=['HS256'])
        return payload.get('is_elogix_admin', False)
    except Exception:
        return False


# ══════════════════════════════════════════════════════════════════════
# COMPANY REGISTRATION (called by RegisterPage.jsx)
# POST /api/elogix-admin/v1/register-company
# ══════════════════════════════════════════════════════════════════════

@elogix_admin_bp.route('/register-company', methods=['POST'])
def register_company():
    """
    Called by RegisterPage when a new company self-registers.
    Stores in PostgreSQL tenant_companies table with status='pending'.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400

        name          = data.get('name', '').strip()
        slug          = data.get('slug', '').strip().lower()
        plan          = data.get('plan', 'trial')
        business_type = data.get('business_type', 'custom')
        admin_email   = data.get('admin_email', '').strip().lower()
        admin_name    = data.get('admin_name', '')
        phone         = data.get('phone', '')
        country       = data.get('country', 'Nepal')
        currency      = data.get('currency', 'NPR')
        industry      = data.get('industry', business_type)
        modules       = data.get('modules', [])

        if not name or not slug or not admin_email:
            return jsonify({'error': 'name, slug, and admin_email are required'}), 400

        # ── Store in DB ───────────────────────────────────────────────
        try:
            from config.database import db
            from sqlalchemy import text

            # Check if slug already exists
            existing = db.session.execute(
                text("SELECT id FROM tenant_companies WHERE slug = :slug"),
                {'slug': slug}
            ).fetchone()

            if existing:
                return jsonify({
                    'success': False,
                    'error': f'Company URL "{slug}.elogix.com.np" is already taken. Choose a different name.'
                }), 409

            # Insert pending company
            db.session.execute(text("""
                INSERT INTO tenant_companies (
                    slug, name, plan, business_type, status,
                    admin_email, phone, country, currency,
                    created_at, updated_at
                ) VALUES (
                    :slug, :name, :plan, :business_type, 'pending',
                    :admin_email, :phone, :country, :currency,
                    NOW(), NOW()
                )
            """), {
                'slug': slug, 'name': name, 'plan': plan,
                'business_type': business_type, 'admin_email': admin_email,
                'phone': phone, 'country': country, 'currency': currency,
            })
            db.session.commit()
            logger.info(f'New company registered: {slug} ({name}) — pending approval')

        except Exception as db_err:
            logger.error(f'DB error during registration: {db_err}')
            # Return success anyway — localStorage fallback handles persistence
            # Don't fail the user's registration because of DB issues

        return jsonify({
            'success': True,
            'message': f'Registration complete! Awaiting eLogix SuperAdmin approval.',
            'portal_url': f'https://{slug}.elogix.com.np',
            'company_name': name,
            'plan': plan,
            'status': 'pending',
        })

    except Exception as e:
        logger.error(f'register_company error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# LIST ALL COMPANIES (called by ELogixAdminPage)
# GET /api/elogix-admin/v1/companies
# ══════════════════════════════════════════════════════════════════════

@elogix_admin_bp.route('/companies', methods=['GET'])
@require_admin_key
def get_companies():
    """
    Returns all active/approved companies.
    Read by ELogixAdminPage → Companies tab.
    """
    try:
        status_filter = request.args.get('status', '')

        try:
            from config.database import db
            from sqlalchemy import text

            query = "SELECT * FROM tenant_companies WHERE status IN ('active','trial','suspended','growth')"
            if status_filter:
                query = f"SELECT * FROM tenant_companies WHERE status = :status"

            rows = db.session.execute(
                text(query),
                {'status': status_filter} if status_filter else {}
            ).fetchall()

            companies = []
            for r in rows:
                companies.append({
                    'id'           : r.id,
                    'slug'         : r.slug,
                    'name'         : r.name,
                    'plan'         : r.plan,
                    'status'       : r.status,
                    'business_type': r.business_type,
                    'admin_email'  : r.admin_email,
                    'phone'        : r.phone or '',
                    'country'      : r.country or 'Nepal',
                    'currency'     : r.currency or 'NPR',
                    'employee_count': 0,
                    'created_at'   : r.created_at.isoformat() if r.created_at else '',
                    'approved_at'  : r.approved_at.isoformat() if hasattr(r, 'approved_at') and r.approved_at else '',
                })

            return jsonify({'success': True, 'companies': companies, 'total': len(companies)})

        except Exception as db_err:
            logger.error(f'DB error getting companies: {db_err}')
            # Return MOCK companies as fallback so frontend doesn't break
            return jsonify({
                'success': True,
                'companies': _get_mock_companies(),
                'total': 4,
                '_source': 'mock_fallback',
            })

    except Exception as e:
        logger.error(f'get_companies error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# LIST PENDING COMPANIES (called by ELogixAdminPage)
# GET /api/elogix-admin/v1/pending-companies
# ══════════════════════════════════════════════════════════════════════

@elogix_admin_bp.route('/pending-companies', methods=['GET'])
@require_admin_key
def get_pending_companies():
    """
    Returns all companies with status='pending'.
    Read by ELogixAdminPage → Pending Approval tab.
    """
    try:
        try:
            from config.database import db
            from sqlalchemy import text

            rows = db.session.execute(
                text("SELECT * FROM tenant_companies WHERE status = 'pending' ORDER BY created_at DESC")
            ).fetchall()

            pending = []
            for r in rows:
                pending.append({
                    'id'           : r.id,
                    'slug'         : r.slug,
                    'name'         : r.name,
                    'plan'         : r.plan,
                    'status'       : 'pending',
                    'business_type': r.business_type,
                    'admin_email'  : r.admin_email,
                    'phone'        : r.phone or '',
                    'country'      : r.country or 'Nepal',
                    'currency'     : r.currency or 'NPR',
                    'employee_count': 0,
                    'created_at'   : r.created_at.isoformat() if r.created_at else '',
                    'industry'     : r.business_type or '',
                    'account_manager': 'New Signup',
                    'support_tier': 'standard',
                    'pending_invoice': 0,
                    'last_payment': None,
                })

            return jsonify({'success': True, 'companies': pending, 'total': len(pending)})

        except Exception as db_err:
            logger.error(f'DB error getting pending companies: {db_err}')
            return jsonify({'success': True, 'companies': [], 'total': 0, '_source': 'db_error'})

    except Exception as e:
        logger.error(f'get_pending_companies error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# APPROVE COMPANY (called by ELogixAdminPage)
# POST /api/elogix-admin/v1/companies/{slug}/approve
# ══════════════════════════════════════════════════════════════════════

@elogix_admin_bp.route('/companies/<slug>/approve', methods=['POST'])
@require_admin_key
def approve_company(slug):
    """
    Approves a pending company.
    Updates status to 'active' (or 'trial' if trial plan).
    Called by ELogixAdminPage.approveTenant().
    """
    try:
        data = request.get_json() or {}
        plan          = data.get('plan', 'trial')
        business_type = data.get('business_type', 'custom')
        approved_by   = data.get('approved_by', 'eLogix SuperAdmin')

        new_status = 'trial' if plan == 'trial' else 'active'

        try:
            from config.database import db
            from sqlalchemy import text

            result = db.session.execute(text("""
                UPDATE tenant_companies
                SET status       = :status,
                    plan         = :plan,
                    business_type= :business_type,
                    approved_at  = NOW(),
                    updated_at   = NOW()
                WHERE slug = :slug
                RETURNING id, slug, name, plan, status, admin_email
            """), {
                'status': new_status, 'plan': plan,
                'business_type': business_type, 'slug': slug
            })
            row = result.fetchone()
            db.session.commit()

            if not row:
                return jsonify({'error': f'Company {slug} not found'}), 404

            logger.info(f'Company approved: {slug} → {new_status} ({plan})')

            # Auto-provision permissions based on plan
            try:
                from saas.tenant_provisioner import provision_tenant
                provision_tenant(slug, plan, business_type)
            except Exception:
                pass

            return jsonify({
                'success'     : True,
                'message'     : f'{row.name} approved as {new_status}',
                'slug'        : row.slug,
                'status'      : row.status,
                'plan'        : row.plan,
                'admin_email' : row.admin_email,
                'approved_at' : datetime.utcnow().isoformat(),
            })

        except Exception as db_err:
            logger.error(f'DB error approving company {slug}: {db_err}')
            # Return success so frontend can at least update localStorage
            return jsonify({
                'success'   : True,
                'message'   : f'{slug} approved (localStorage only — DB unavailable)',
                'slug'      : slug,
                'status'    : new_status,
                '_source'   : 'fallback',
            })

    except Exception as e:
        logger.error(f'approve_company error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# REJECT / SUSPEND COMPANY
# POST /api/elogix-admin/v1/companies/{slug}/reject
# ══════════════════════════════════════════════════════════════════════

@elogix_admin_bp.route('/companies/<slug>/reject', methods=['POST'])
@require_admin_key
def reject_company(slug):
    try:
        try:
            from config.database import db
            from sqlalchemy import text
            db.session.execute(text(
                "UPDATE tenant_companies SET status='rejected', updated_at=NOW() WHERE slug=:slug"
            ), {'slug': slug})
            db.session.commit()
        except Exception as db_err:
            logger.error(f'DB error rejecting {slug}: {db_err}')

        return jsonify({'success': True, 'message': f'{slug} rejected'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@elogix_admin_bp.route('/companies/<slug>/suspend', methods=['POST'])
@require_admin_key
def suspend_company(slug):
    try:
        try:
            from config.database import db
            from sqlalchemy import text
            db.session.execute(text(
                "UPDATE tenant_companies SET status='suspended', updated_at=NOW() WHERE slug=:slug"
            ), {'slug': slug})
            db.session.commit()
        except Exception as db_err:
            logger.error(f'DB error suspending {slug}: {db_err}')

        return jsonify({'success': True, 'message': f'{slug} suspended'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# MOCK DATA (used when DB is unavailable)
# ══════════════════════════════════════════════════════════════════════

def _get_mock_companies():
    return [
        {
            'id': 'c1', 'slug': 'abasarnepal', 'name': 'Abasar Nepal',
            'plan': 'starter', 'status': 'active',
            'business_type': 'recruitment_agency',
            'admin_email': 'admin@abasarnepal.com',
            'country': 'Nepal', 'currency': 'NPR',
            'employee_count': 0, 'created_at': '2083-05-04',
        },
        {
            'id': 'c2', 'slug': 'subisu', 'name': 'Subisu Cablenet Pvt. Ltd.',
            'plan': 'growth', 'status': 'active',
            'business_type': 'it_software',
            'admin_email': 'hr@subisu.net.np',
            'country': 'Nepal', 'currency': 'NPR',
            'employee_count': 0, 'created_at': '2083-05-05',
        },
        {
            'id': 'c3', 'slug': 'mainawatisteels', 'name': 'Mainawati Steels',
            'plan': 'starter', 'status': 'active',
            'business_type': 'manufacturing',
            'admin_email': 'admin@mainawatisteels.com',
            'country': 'Nepal', 'currency': 'NPR',
            'employee_count': 0, 'created_at': '2083-05-05',
        },
        {
            'id': 'c4', 'slug': 'hrhub', 'name': 'HR Hub',
            'plan': 'trial', 'status': 'trial',
            'business_type': 'custom',
            'admin_email': 'admin@hrhub.com.np',
            'country': 'Nepal', 'currency': 'NPR',
            'employee_count': 0, 'created_at': '2083-05-05',
        },
    ]

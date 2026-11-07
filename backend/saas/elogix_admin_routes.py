# FILE: backend/saas/elogix_admin_routes.py
# eLogix HRMS — eLogix SuperAdmin API Routes
# Handles: company registration, pending approvals, approval/rejection
# These routes are called by:
#   - RegisterPage.jsx        → POST /api/elogix-admin/v1/register-company
#   - ELogixAdminPage.jsx     → GET  /api/elogix-admin/v1/companies
#   - ELogixAdminPage.jsx     → GET  /api/elogix-admin/v1/pending-companies
#   - ELogixAdminPage.jsx     → POST /api/elogix-admin/v1/companies/{slug}/approve
#   - ELogixAdminPage.jsx     → PUT  /api/elogix-admin/v1/companies/{slug}/status
#   - ELogixAdminPage.jsx     → POST /api/elogix-admin/v1/companies/{slug}/reset-password
#   - ELogixAdminPage.jsx     → GET  /api/elogix-admin/v1/team
# eLogix Technologies · www.elogix.com.np

from flask import Blueprint, request, jsonify, g
from datetime import datetime
from sqlalchemy import text
import logging, os

logger = logging.getLogger('elogix.saas_admin')
elogix_admin_bp = Blueprint('elogix_admin', __name__)

# ── Admin key validation ──────────────────────────────────────────────
ADMIN_KEY = os.getenv('ELOGIX_ADMIN_KEY')
if not ADMIN_KEY:
    raise RuntimeError('ELOGIX_ADMIN_KEY environment variable is not set')

SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError('SECRET_KEY environment variable is not set')


def require_admin_key(f):
    """Decorator: validates X-eLogix-Admin-Key header OR Bearer JWT admin token."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        key   = request.headers.get('X-eLogix-Admin-Key', '')
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if key != ADMIN_KEY and not _valid_admin_token(token):
            return jsonify({'error': 'Unauthorized — invalid admin key'}), 401
        return f(*args, **kwargs)
    return decorated


def _valid_admin_token(token):
    """Validate JWT admin token."""
    try:
        import jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
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

        from config.database import db

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
                admin_email, admin_name, phone, country, currency,
                created_at, updated_at
            ) VALUES (
                :slug, :name, :plan, :business_type, 'pending',
                :admin_email, :admin_name, :phone, :country, :currency,
                NOW(), NOW()
            )
        """), {
            'slug': slug, 'name': name, 'plan': plan,
            'business_type': business_type, 'admin_email': admin_email,
            'admin_name': admin_name, 'phone': phone,
            'country': country, 'currency': currency,
        })
        db.session.commit()
        logger.info(f'New company registered: {slug} ({name}) — pending approval')

        return jsonify({
            'success': True,
            'message': 'Registration complete! Awaiting eLogix SuperAdmin approval.',
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

        from config.database import db

        if status_filter:
            rows = db.session.execute(
                text("SELECT * FROM tenant_companies WHERE status = :status ORDER BY created_at DESC"),
                {'status': status_filter}
            ).fetchall()
        else:
            rows = db.session.execute(
                text("SELECT * FROM tenant_companies WHERE status NOT IN ('pending','rejected') ORDER BY created_at DESC")
            ).fetchall()

        companies = []
        for r in rows:
            companies.append({
                'id'            : r.id,
                'slug'          : r.slug,
                'name'          : r.name,
                'plan'          : r.plan,
                'status'        : r.status,
                'business_type' : r.business_type,
                'industry'      : getattr(r, 'industry', None) or r.business_type or '',
                'admin_email'   : r.admin_email,
                'admin_name'    : getattr(r, 'admin_name', None) or '',
                'phone'         : r.phone or '',
                'country'       : r.country or 'Nepal',
                'currency'      : r.currency or 'NPR',
                'employee_count': getattr(r, 'employee_count', 0) or 0,
                'max_employees' : getattr(r, 'max_employees', None) or 0,
                'account_manager': getattr(r, 'account_manager', None) or '',
                'support_tier'  : getattr(r, 'support_tier', None) or 'standard',
                'pending_invoice': getattr(r, 'pending_invoice', 0) or 0,
                'last_payment'  : getattr(r, 'last_payment', None),
                'created_at'    : r.created_at.isoformat() if r.created_at else '',
                'approved_at'   : r.approved_at.isoformat() if getattr(r, 'approved_at', None) else '',
            })

        return jsonify({'success': True, 'companies': companies, 'total': len(companies)})

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
        from config.database import db

        rows = db.session.execute(
            text("SELECT * FROM tenant_companies WHERE status = 'pending' ORDER BY created_at DESC")
        ).fetchall()

        pending = []
        for r in rows:
            pending.append({
                'id'            : r.id,
                'slug'          : r.slug,
                'name'          : r.name,
                'plan'          : r.plan,
                'status'        : 'pending',
                'business_type' : r.business_type,
                'industry'      : getattr(r, 'industry', None) or r.business_type or '',
                'admin_email'   : r.admin_email,
                'admin_name'    : getattr(r, 'admin_name', None) or '',
                'phone'         : r.phone or '',
                'country'       : r.country or 'Nepal',
                'currency'      : r.currency or 'NPR',
                'employee_count': 0,
                'max_employees' : getattr(r, 'max_employees', None) or 0,
                'account_manager': 'New Signup',
                'support_tier'  : 'standard',
                'pending_invoice': 0,
                'last_payment'  : None,
                'created_at'    : r.created_at.isoformat() if r.created_at else '',
                'registered_at' : r.created_at.isoformat() if r.created_at else '',
            })

        return jsonify({'success': True, 'companies': pending, 'total': len(pending)})

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
        data          = request.get_json() or {}
        plan          = data.get('plan', 'trial')
        business_type = data.get('business_type', 'custom')
        approved_by   = data.get('approved_by', 'eLogix SuperAdmin')
        new_status    = 'trial' if plan == 'trial' else 'active'

        from config.database import db

        result = db.session.execute(text("""
            UPDATE tenant_companies
            SET status        = :status,
                plan          = :plan,
                business_type = :business_type,
                approved_at   = NOW(),
                approved_by   = :approved_by,
                updated_at    = NOW()
            WHERE slug = :slug
            RETURNING id, slug, name, plan, status, admin_email
        """), {
            'status': new_status, 'plan': plan,
            'business_type': business_type,
            'approved_by': approved_by,
            'slug': slug,
        })
        row = result.fetchone()
        db.session.commit()

        if not row:
            return jsonify({'error': f'Company "{slug}" not found'}), 404

        logger.info(f'Company approved: {slug} → {new_status} ({plan})')

        # Auto-provision permissions based on plan
        try:
            from saas.tenant_provisioner import provision_tenant
            provision_tenant(slug, plan, business_type)
        except Exception as prov_err:
            logger.warning(f'provision_tenant({slug}) failed: {prov_err}')

        return jsonify({
            'success'    : True,
            'message'    : f'{row.name} approved as {new_status}',
            'slug'       : row.slug,
            'status'     : row.status,
            'plan'       : row.plan,
            'admin_email': row.admin_email,
            'approved_at': datetime.utcnow().isoformat(),
        })

    except Exception as e:
        logger.error(f'approve_company error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# STATUS CHANGE — suspend / reactivate / cancel
# PUT /api/elogix-admin/v1/companies/{slug}/status
# ══════════════════════════════════════════════════════════════════════

@elogix_admin_bp.route('/companies/<slug>/status', methods=['PUT'])
@require_admin_key
def set_company_status(slug):
    """
    Change a company's status (suspend, reactivate, cancel).
    Called by ELogixAdminPage.handleAction().
    """
    try:
        data       = request.get_json() or {}
        new_status = data.get('status', '')
        allowed    = {'active', 'suspended', 'cancelled', 'trial'}

        if new_status not in allowed:
            return jsonify({'error': f'status must be one of: {", ".join(sorted(allowed))}'}), 400

        from config.database import db

        result = db.session.execute(text("""
            UPDATE tenant_companies
            SET status = :status, updated_at = NOW()
            WHERE slug = :slug
            RETURNING slug, status
        """), {'status': new_status, 'slug': slug})
        row = result.fetchone()
        db.session.commit()

        if not row:
            return jsonify({'error': f'Company "{slug}" not found'}), 404

        logger.info(f'Company status changed: {slug} → {new_status}')
        return jsonify({'success': True, 'slug': row.slug, 'status': row.status})

    except Exception as e:
        logger.error(f'set_company_status error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# REJECT COMPANY
# POST /api/elogix-admin/v1/companies/{slug}/reject
# ══════════════════════════════════════════════════════════════════════

@elogix_admin_bp.route('/companies/<slug>/reject', methods=['POST'])
@require_admin_key
def reject_company(slug):
    try:
        from config.database import db
        db.session.execute(text(
            "UPDATE tenant_companies SET status='rejected', updated_at=NOW() WHERE slug=:slug"
        ), {'slug': slug})
        db.session.commit()
        logger.info(f'Company rejected: {slug}')
        return jsonify({'success': True, 'message': f'{slug} rejected'})
    except Exception as e:
        logger.error(f'reject_company error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# MANUAL ONBOARD (admin creates a company directly)
# POST /api/elogix-admin/v1/companies
# ══════════════════════════════════════════════════════════════════════

@elogix_admin_bp.route('/companies', methods=['POST'])
@require_admin_key
def create_company():
    """
    Called by ELogixAdminPage handleCreate() — admin onboards a client manually.
    """
    try:
        data = request.get_json() or {}
        company_name    = data.get('company_name', '').strip()
        slug            = data.get('slug', '').strip().lower()
        admin_email     = data.get('admin_email', '').strip().lower()
        admin_name      = data.get('admin_name', '')
        plan            = data.get('plan', 'starter')
        industry        = data.get('industry', '')
        country         = data.get('country', 'Nepal')
        phone           = data.get('phone', '')
        account_manager = data.get('account_manager', '')

        if not company_name or not slug or not admin_email:
            return jsonify({'error': 'company_name, slug, admin_email required'}), 400

        from config.database import db

        existing = db.session.execute(
            text("SELECT id FROM tenant_companies WHERE slug = :slug"),
            {'slug': slug}
        ).fetchone()
        if existing:
            return jsonify({'error': f'Slug "{slug}" is already taken'}), 409

        new_status = 'trial' if plan == 'trial' else 'active'

        db.session.execute(text("""
            INSERT INTO tenant_companies (
                slug, name, plan, business_type, status,
                admin_email, admin_name, phone, country, industry,
                account_manager, approved_at, approved_by, created_at, updated_at
            ) VALUES (
                :slug, :name, :plan, 'custom', :status,
                :admin_email, :admin_name, :phone, :country, :industry,
                :account_manager, NOW(), 'eLogix Admin (manual)', NOW(), NOW()
            )
        """), {
            'slug': slug, 'name': company_name, 'plan': plan,
            'status': new_status, 'admin_email': admin_email,
            'admin_name': admin_name, 'phone': phone,
            'country': country, 'industry': industry,
            'account_manager': account_manager,
        })
        db.session.commit()
        logger.info(f'Manual onboard: {slug} ({company_name}) → {new_status}')

        return jsonify({
            'success': True,
            'message': f'{company_name} provisioned successfully',
            'slug': slug, 'status': new_status, 'plan': plan,
        })

    except Exception as e:
        logger.error(f'create_company error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# RESET ADMIN PASSWORD
# POST /api/elogix-admin/v1/companies/{slug}/reset-password
# ══════════════════════════════════════════════════════════════════════

@elogix_admin_bp.route('/companies/<slug>/reset-password', methods=['POST'])
@require_admin_key
def reset_company_password(slug):
    """
    Called by ELogixAdminPage handlePasswordReset().
    Updates admin password in auth_users table.
    """
    try:
        data         = request.get_json() or {}
        admin_email  = data.get('admin_email', '').strip().lower()
        admin_name   = data.get('admin_name', '')
        phone        = data.get('phone', '')
        new_password = data.get('new_password', '')
        reason       = data.get('reason', '')

        if not admin_email or not new_password:
            return jsonify({'error': 'admin_email and new_password required'}), 400
        if len(new_password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400

        # Forward to internal auth service to hash and store the password
        try:
            from saas.tenant_provisioner import reset_admin_password
            reset_admin_password(slug, admin_email, new_password, admin_name, phone)
        except Exception as prov_err:
            logger.warning(f'reset_admin_password({slug}) provisioner failed: {prov_err}')
            # Still try updating the DB record directly
            from config.database import db
            db.session.execute(text("""
                UPDATE auth_users
                SET password_hash = crypt(:pw, gen_salt('bf')),
                    updated_at    = NOW()
                WHERE email = :email
            """), {'pw': new_password, 'email': admin_email})
            db.session.commit()

        logger.info(f'Password reset: {slug} / {admin_email} — reason: {reason or "none"}')
        return jsonify({'success': True, 'message': f'Password reset for {admin_email}'})

    except Exception as e:
        logger.error(f'reset_company_password error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# INTERNAL TEAM
# GET /api/elogix-admin/v1/team
# ══════════════════════════════════════════════════════════════════════

@elogix_admin_bp.route('/team', methods=['GET'])
@require_admin_key
def get_team():
    """
    Returns eLogix internal staff list from the database.
    Read by ELogixAdminPage → eLogix Team tab.
    """
    try:
        from config.database import db

        rows = db.session.execute(
            text("SELECT name, email, role, status FROM elogix_staff ORDER BY name ASC")
        ).fetchall()

        team = [{'name': r.name, 'email': r.email, 'role': r.role, 'status': r.status}
                for r in rows]

        return jsonify({'success': True, 'team': team})

    except Exception as e:
        logger.error(f'get_team error: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500

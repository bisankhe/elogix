# FILE: backend/routes/provision_routes.py
# eLogix HRMS — Internal Tenant Provisioning Routes
# Called by server.js when a tenant is approved
# Creates the database user account so tenant admin can log in
# eLogix Technologies · www.elogix.com.np

import os
import bcrypt
import logging
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from backend.extensions import db

logger = logging.getLogger('elogix.provision')
provision_bp = Blueprint('provision', __name__)

INTERNAL_KEY = os.getenv('ELOGIX_ADMIN_KEY', 'elogix-admin-2026')


def _auth(req):
    key = req.headers.get('X-Internal-Key', '')
    return key == INTERNAL_KEY


@provision_bp.route('/provision-tenant', methods=['POST'])
def provision_tenant():
    """
    Called by server.js after admin approves a tenant company.
    Creates:
      1. tenant_companies row (if not exists)
      2. users row for the admin account
    So the tenant admin can immediately log in.
    """
    if not _auth(request):
        return jsonify({'error': 'Unauthorized'}), 401

    data          = request.get_json() or {}
    slug          = data.get('slug', '').strip().lower()
    admin_email   = data.get('admin_email', '').strip().lower()
    admin_name    = data.get('admin_name', '')
    plan          = data.get('plan', 'trial')
    business_type = data.get('business_type', 'custom')

    if not slug or not admin_email:
        return jsonify({'error': 'slug and admin_email required'}), 400

    try:
        # 1. Upsert tenant_companies
        existing = db.session.execute(
            text("SELECT id FROM tenant_companies WHERE slug=:slug"),
            {'slug': slug}
        ).fetchone()

        if existing:
            company_id = existing.id
            db.session.execute(text("""
                UPDATE tenant_companies
                SET status='active', plan=:plan, updated_at=NOW()
                WHERE id=:cid
            """), {'plan': plan, 'cid': company_id})
        else:
            result = db.session.execute(text("""
                INSERT INTO tenant_companies (
                    slug, name, plan, business_type, admin_email,
                    status, country, currency, created_at, updated_at
                ) VALUES (
                    :slug, :slug, :plan, :btype, :email,
                    'active', 'Nepal', 'NPR', NOW(), NOW()
                ) RETURNING id
            """), {
                'slug': slug, 'plan': plan,
                'btype': business_type, 'email': admin_email,
            })
            company_id = result.fetchone().id

        # 2. Create admin user if not exists
        user_exists = db.session.execute(
            text("SELECT id FROM users WHERE LOWER(email)=:email AND company_id=:cid"),
            {'email': admin_email, 'cid': company_id}
        ).fetchone()

        if not user_exists:
            # Default password = email (user must change on first login)
            pw_hash = bcrypt.hashpw(admin_email.encode(), bcrypt.gensalt(12)).decode()
            db.session.execute(text("""
                INSERT INTO users (
                    company_id, email, password_hash, role,
                    is_active, is_verified, created_at, updated_at
                ) VALUES (
                    :cid, :email, :pw, 'super_admin',
                    TRUE, TRUE, NOW(), NOW()
                )
            """), {'cid': company_id, 'email': admin_email, 'pw': pw_hash})

        db.session.commit()
        logger.info(f'Tenant provisioned: {slug} company_id={company_id}')

        return jsonify({
            'success'   : True,
            'company_id': company_id,
            'message'   : f'{slug} provisioned. Admin can log in with {admin_email}',
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f'Provision error [{slug}]: {e}', exc_info=True)
        return jsonify({'error': str(e)}), 500


@provision_bp.route('/check-slug', methods=['GET'])
def check_slug():
    """Check if a company slug is available (called by RegisterPage)."""
    slug = request.args.get('slug', '').strip().lower()
    if not slug:
        return jsonify({'available': False, 'error': 'Slug required'}), 400
    try:
        exists = db.session.execute(
            text("SELECT 1 FROM tenant_companies WHERE slug=:slug"),
            {'slug': slug}
        ).fetchone()
        return jsonify({'available': not exists, 'slug': slug})
    except Exception as e:
        return jsonify({'available': False, 'error': str(e)}), 500

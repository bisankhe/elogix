# FILE: backend/saas/elogix_admin_routes_patch.py
# ==================================================
# PATCH — Add these TWO routes to elogix_admin_routes.py
#
# The existing file already has:
#   Blueprint prefix: /api/elogix-admin/v1
#   @require_elogix_admin() decorator on all routes
#
# Add these routes INSIDE the existing blueprint file,
# after the existing GET /companies route.
# ==================================================

# ─── PASTE THIS BLOCK into elogix_admin_routes.py ────────────────────────────
#
# Route 1: GET /pending-companies
#   Called by ELogixAdminPage.jsx → /api/elogix-admin/v1/pending-companies
#   Returns companies with status IN ('pending', 'trial', 'review')
#
@elogix_admin_bp.route('/pending-companies', methods=['GET'])
@require_elogix_admin()
def get_pending_companies():
    """
    Return companies awaiting activation / approval.
    ELogixAdminPage calls this to show the 'Pending Approvals' tab.
    """
    try:
        conn = get_db_connection()          # use whatever DB helper exists in the file
        cur  = conn.cursor()

        cur.execute("""
            SELECT
                id,
                company_name  AS name,
                company_slug  AS slug,
                company_email AS email,
                status,
                plan,
                employee_count,
                contact_phone,
                industry,
                created_at,
                updated_at
            FROM companies
            WHERE status IN ('pending', 'trial', 'review', 'suspended')
            ORDER BY created_at DESC
            LIMIT 100
        """)
        rows = cur.fetchall()

        companies = []
        for r in rows:
            # Support both dict-cursor and tuple-cursor
            if hasattr(r, 'keys'):
                company = dict(r)
            else:
                cols = [d[0] for d in cur.description]
                company = dict(zip(cols, r))
            companies.append(company)

        cur.close()
        conn.close()

        return jsonify({
            'success':   True,
            'companies': companies,
            'count':     len(companies),
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Route 2: POST /login
#   Called by LoginPage.jsx → POST /api/elogix-admin/v1/login
#   Validates email + password for eLogix staff accounts
#   ALSO requires X-eLogix-Admin-Key header (enforced by @require_elogix_admin)
#
@elogix_admin_bp.route('/login', methods=['POST'])
@require_elogix_admin()
def elogix_admin_login():
    """
    eLogix staff login.
    The X-eLogix-Admin-Key header is already validated by @require_elogix_admin().
    This endpoint additionally checks email + password for staff accounts.

    Body:  { "email": "...", "password": "..." }
    Returns: { success, token, user: { id, name, email, role } }
    """
    from flask import request, jsonify
    import hashlib, os, time, json

    data     = request.get_json(force=True, silent=True) or {}
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required'}), 400

    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        # Try elogix_staff table first; fall back to generic users with is_elogix_staff flag
        cur.execute("""
            SELECT id, full_name, email, role, password_hash
            FROM elogix_staff
            WHERE email = %s AND is_active = TRUE
            LIMIT 1
        """, (email,))
        row = cur.fetchone()

        # Fallback: check main users table for elogix_* roles
        if not row:
            cur.execute("""
                SELECT id, full_name, email, role, password_hash
                FROM users
                WHERE email = %s
                  AND role IN ('elogix_superadmin','elogix_staff','elogix_admin')
                  AND is_active = TRUE
                LIMIT 1
            """, (email,))
            row = cur.fetchone()

        cur.close()
        conn.close()

        if not row:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

        # Column extraction
        if hasattr(row, 'keys'):
            r = dict(row)
        else:
            r = dict(zip(['id','full_name','email','role','password_hash'], row))

        # Verify password — support plain bcrypt or sha256 fallback
        import bcrypt as _bcrypt
        stored_hash = (r.get('password_hash') or '').encode()
        password_ok = False
        try:
            password_ok = _bcrypt.checkpw(password.encode(), stored_hash)
        except Exception:
            # sha256 fallback used during dev seeding
            sha = hashlib.sha256(password.encode()).hexdigest()
            password_ok = (sha == r.get('password_hash'))

        if not password_ok:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

        # Issue a simple JWT-like token (replace with your existing JWT helper if available)
        try:
            from flask_jwt_extended import create_access_token
            token = create_access_token(identity=str(r['id']))
        except ImportError:
            import base64
            payload = json.dumps({'sub': str(r['id']), 'role': r['role'], 'iat': int(time.time())})
            token = base64.urlsafe_b64encode(payload.encode()).decode()

        return jsonify({
            'success': True,
            'token':   token,
            'user': {
                'id':    r['id'],
                'name':  r['full_name'],
                'email': r['email'],
                'role':  r['role'],
            },
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ─── END PATCH ────────────────────────────────────────────────────────────────

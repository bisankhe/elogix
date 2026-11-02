# FILE: backend/routes/auth_routes_patch.py
# =============================================
# PATCH — Add this ONE route to auth_routes.py
#
# The existing file already has:
#   Blueprint prefix: /api/v1/auth
#   POST /login  (tenant login)
#
# Add this route INSIDE the existing blueprint file,
# after the existing POST /login route.
# =============================================

# ─── PASTE THIS BLOCK into auth_routes.py ────────────────────────────────────
#
# Route: GET /slugs
#   Called by LoginPage.jsx → GET /api/v1/auth/slugs
#   Returns list of active company slugs for autocomplete
#   PUBLIC — no auth required (only returns slugs, not sensitive data)
#
@auth_bp.route('/slugs', methods=['GET'])
def get_company_slugs():
    """
    Return a list of active company slugs for the login page autocomplete.
    This is a public endpoint — it reveals only slug names, not company details.
    Rate-limit this in production (nginx / flask-limiter).

    Returns: { slugs: ['abasarnepal', 'subisu', ...] }
    """
    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        cur.execute("""
            SELECT company_slug
            FROM companies
            WHERE status IN ('active', 'trial')
            ORDER BY company_name ASC
            LIMIT 200
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        slugs = [r[0] if not hasattr(r, 'keys') else r['company_slug']
                 for r in rows if r]

        return jsonify({'success': True, 'slugs': slugs}), 200

    except Exception as e:
        # Fail silently — login page just won't show autocomplete
        return jsonify({'success': False, 'slugs': [], 'error': str(e)}), 200

# ─── END PATCH ────────────────────────────────────────────────────────────────

# eLogix HRMS — Fix Pack 3: API Path Fixes
# ==========================================
# Fixes all 404 errors shown in the browser console.
#
# Console errors this fixes:
#   LoginPage.jsx:189  GET  /api/companies/slugs 404
#   LoginPage.jsx:248  POST /api/auth/admin-login 404
#   ELogixAdminPage.jsx:152 GET /api/elogix-admin/v1/companies 404
#   ELogixAdminPage.jsx:192 GET /api/elogix-admin/v1/pending-companies 404

## STEP 1 — Copy frontend file
# ─────────────────────────────
# Replace your current LoginPage.jsx with the fixed version:

  cp fix3/src/pages/auth/LoginPage.jsx \
     YOUR_PROJECT/src/pages/auth/LoginPage.jsx

# What changed:
#   OLD (broken)       →  NEW (correct)
#   /api/companies/slugs          → /api/v1/auth/slugs
#   POST /api/auth/admin-login    → POST /api/elogix-admin/v1/login
#   POST /api/auth/login          → POST /api/v1/auth/login
#   body field: identifier        → email
#   body field: slug              → company_slug


## STEP 2 — Add 2 routes to elogix_admin_routes.py
# ─────────────────────────────────────────────────
# Open:  YOUR_PROJECT/backend/saas/elogix_admin_routes.py
# Paste the contents of fix3/backend/saas/elogix_admin_routes_patch.py
# at the end of the file (before the last line if there is one).
#
# Adds:
#   POST /api/elogix-admin/v1/login            (eLogix staff login)
#   GET  /api/elogix-admin/v1/pending-companies (pending approvals tab)


## STEP 3 — Add 1 route to auth_routes.py
# ─────────────────────────────────────────
# Open:  YOUR_PROJECT/backend/routes/auth_routes.py
# Paste the contents of fix3/backend/routes/auth_routes_patch.py
# at the end of the file.
#
# Adds:
#   GET /api/v1/auth/slugs   (company slug autocomplete — public)


## STEP 4 — Set the admin key in .env
# ─────────────────────────────────────
# YOUR_PROJECT/backend/.env  (or wherever your Flask env vars are)

  ELOGIX_ADMIN_KEY=elogix-admin-2026

# The ELogixAdminPage default key is 'elogix-admin-2026'
# The LoginPage default key is  'elogix-admin-2026'
# They MUST match ELOGIX_ADMIN_KEY in your .env.
# Change all three together if you want a stronger key.


## STEP 5 — Restart Flask
# ─────────────────────────
  # Kill the old process and start fresh:
  pkill -f "flask run" || pkill -f "python app.py"
  cd YOUR_PROJECT/backend
  flask run --host=0.0.0.0 --port=5000


## STEP 6 — Rebuild frontend
# ────────────────────────────
  cd YOUR_PROJECT
  npm run build   # or: npm run dev  (for dev mode)


## STEP 7 — Verify (browser console should be clean)
# ─────────────────────────────────────────────────────
  # Open browser DevTools → Network tab → reload the app
  # You should see:
  #   GET  /api/v1/auth/slugs             200  (or still 200 with empty slugs)
  #   POST /api/elogix-admin/v1/login     200  (on admin login attempt)
  #   GET  /api/elogix-admin/v1/companies 200
  #   GET  /api/elogix-admin/v1/pending-companies  200


## NOTES
# ───────
# - The /api/elogix-admin/v1/companies 404 happens because Flask isn't
#   running (the route DOES exist). Start Flask on port 5000.
#
# - The Node.js server.js runs on port 8080, NOT port 5000. 
#   The Vite proxy points to 5000 (Flask). Both can run simultaneously.
#
# - EADDRINUSE :8080 just means Node.js is already running — that's fine,
#   it doesn't affect Flask or the Vite proxy.
#
# - If you still get 404 after starting Flask, check:
#     curl http://127.0.0.1:5000/api/v1/auth/login
#   It should return a JSON error (not "Not Found").

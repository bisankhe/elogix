// FILE: src/context/AuthContext.jsx
// eLogix HRMS — Authentication Context
// ─────────────────────────────────────────────────────────────────────
// Integrates with:
//   src/hooks/useAuth.js           — thin hook that calls useContext(AuthContext)
//   src/hooks/useTenant.js         — reads currentCompany from this context
//   src/hooks/usePermissions.jsx   — reads permissions from this context
//   src/utils/rbac.js              — uses permissions.modules for canAccess()
//   src/utils/tenantRouting.js     — getLandingRoute + resolveTenantPermissions
//   src/data/rolePersonaMap.js     — role → persona name (for display)
//   src/components/layout/Sidebar.jsx  — reads permissions to filter menu
//   src/pages/elogix-admin/ELogixAdminPage.jsx  — adminSession landing
//   src/pages/company/CompanyDashboardPage.jsx  — tenant company landing
//
// eLogix Technologies · www.elogix.com.np

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getLandingRoute,
  resolveTenantPermissions,
  tenantSet,
  tenantClearAll,
} from '../utils/tenantRouting.js'

// ── Context ───────────────────────────────────────────────────────────
export const AuthContext = createContext(null)

// ── Storage keys (eLogix-level — NOT tenant-namespaced) ───────────────
const SESSION_KEY       = 'elogix_session'        // tenant session
const ADMIN_SESSION_KEY = 'elogix_admin_session'  // eLogix staff session

function _loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch(_e) { return null }
}

// ══════════════════════════════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════════════════════════════

export function AuthProvider({ children }) {
  // Tenant session state
  const [session,      setSession]      = useState(null)  // { access_token, user, company, remember }
  const [adminSession, setAdminSession] = useState(null)  // { access_token, admin }
  const [permissions,  setPermissions]  = useState(null)  // resolved { modules[], landing, plan, ... }
  const [ready,        setReady]        = useState(false) // true once localStorage hydrated

  // ── Hydrate from localStorage on mount ──────────────────────────
  useEffect(() => {
    const s  = _loadJSON(SESSION_KEY)
    const as = _loadJSON(ADMIN_SESSION_KEY)

    if (s?.access_token) {
      setSession(s)
      _resolveAndCachePerms(s)
    }
    if (as?.access_token) {
      setAdminSession(as)
    }
    setReady(true)
  }, [])

  // ── Internal: resolve permissions and cache them ─────────────────
  function _resolveAndCachePerms(s) {
    if (!s?.user || !s?.company) return
    const resolved = resolveTenantPermissions(s.user, s.company)
    setPermissions(resolved)
    // Cache in tenant-scoped storage so Sidebar can read without prop-drilling
    tenantSet(s.company.slug, 'permissions', resolved)
  }

  // ── loginTenant ─────────────────────────────────────────────────
  /**
   * Called after a successful tenant user login (from LoginPage.jsx).
   * Stores session, resolves permissions, persists to localStorage.
   *
   * @param {object}  data     - API/mock response { user, company, access_token, refresh_token }
   * @param {boolean} remember - if true, persists across browser close
   */
  const loginTenant = useCallback((data, remember = false) => {
    const s = {
      access_token  : data.access_token,
      refresh_token : data.refresh_token || null,
      user          : data.user,
      company       : data.company,
      remember,
      loginAt       : Date.now(),
    }
    setSession(s)
    _resolveAndCachePerms(s)

    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    } else {
      // Still write to localStorage for page refresh support,
      // but mark as sessionOnly so logout-on-close logic can detect it
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, _sessionOnly: true }))
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
    }
  }, [])

  // ── loginAdmin ──────────────────────────────────────────────────
  /**
   * Called after a successful eLogix internal staff login.
   *
   * @param {object} data     - { access_token, admin: { id, full_name, role, email } }
   * @param {string} adminKey - optional 2FA key
   */
  const loginAdmin = useCallback((data, adminKey = '') => {
    const s = {
      access_token : data.access_token,
      admin        : data.admin,
      adminKey,
      loginAt      : Date.now(),
    }
    setAdminSession(s)
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(s))
  }, [])

  // ── logout ──────────────────────────────────────────────────────
  /**
   * Clears all session state.
   * @param {{ clearAll?: boolean }} opts - clearAll wipes all tenant localStorage too
   */
  const logout = useCallback((opts = {}) => {
    const slug = session?.company?.slug
    setSession(null)
    setAdminSession(null)
    setPermissions(null)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(ADMIN_SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    if (opts.clearAll && slug) tenantClearAll(slug)
  }, [session])

  // ── getDashboardPage ────────────────────────────────────────────
  /**
   * Returns the correct landing page key for the current user.
   * ALWAYS role-first — business_type never affects this.
   * Used by ProtectedRoute.jsx redirect logic and AppRouter.jsx.
   *
   * @returns {string} page key (e.g. 'hr-manager-dashboard', 'elogix-admin')
   */
  const getDashboardPage = useCallback(() => {
    if (adminSession?.admin) return getLandingRoute(adminSession.admin, true)
    if (session?.user)       return getLandingRoute(session.user, false)
    return 'login'
  }, [session, adminSession])

  // ── hasModule ───────────────────────────────────────────────────
  /**
   * Check if current user's resolved permissions include a module.
   * Used by Sidebar.jsx, ProtectedRoute.jsx, usePermissions.jsx.
   *
   * @param {string} moduleKey - e.g. 'recruitment_ats', 'payroll'
   */
  const hasModule = useCallback((moduleKey) => {
    if (!permissions?.modules) return false
    return permissions.modules.includes(moduleKey)
  }, [permissions])

  // ── updateCompany ───────────────────────────────────────────────
  /**
   * Called when SuperAdmin updates company plan/modules from admin panel.
   * Re-resolves permissions without forcing re-login.
   */
  const updateCompany = useCallback((updatedCompany) => {
    if (!session) return
    const updated = { ...session, company: { ...session.company, ...updatedCompany } }
    setSession(updated)
    _resolveAndCachePerms(updated)
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  }, [session])

  // ── Derived booleans ─────────────────────────────────────────────
  const isAuthenticated = !!session?.access_token
  const isAdmin         = !!adminSession?.access_token

  // ── Context value ────────────────────────────────────────────────
  const value = {
    // State
    isAuthenticated,
    isAdmin,
    ready,

    // Current entities (null when not logged in)
    currentUser    : session?.user        || null,
    currentCompany : session?.company     || null,
    currentAdmin   : adminSession?.admin  || null,

    // Resolved permissions { modules[], landing, plan, bizType, role }
    permissions,

    // Raw sessions (needed by useTenant.js, useAuth.js)
    session,
    adminSession,

    // Actions
    loginTenant,
    loginAdmin,
    logout,
    updateCompany,

    // Helpers
    getDashboardPage,
    hasModule,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Primary hook (re-exported for convenience) ────────────────────────
// src/hooks/useAuth.js does: import { useAuth } from '../context/AuthContext'
// so both import paths work.
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('[eLogix] useAuth must be used inside <AuthProvider>')
  return ctx
}

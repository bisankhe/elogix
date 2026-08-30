// FILE: src/components/auth/ProtectedRoute.jsx
// eLogix HRMS — Route Guard Component
// ─────────────────────────────────────────────────────────────────────
// Integrates with:
//   src/context/AuthContext.jsx      — isAuthenticated, isAdmin, permissions, getDashboardPage()
//   src/hooks/usePermissions.jsx     — canAccess() / hasModule() for component-level checks
//   src/utils/rbac.js                — RBAC permission definitions
//   src/AppRouter.jsx                — wraps all route <Route> definitions
//   src/pages/elogix-admin/ELogixAdminPage.jsx  — adminOnly target
//   src/components/dashboard/*.jsx  — tenantOnly targets
//   src/components/shared/LoadingScreen.jsx    — shown while auth hydrates
//
// USAGE in AppRouter.jsx:
//
//   // Any authenticated user (tenant or admin):
//   <ProtectedRoute><SomePage /></ProtectedRoute>
//
//   // eLogix admin staff only:
//   <ProtectedRoute adminOnly><ELogixAdminPage /></ProtectedRoute>
//
//   // Tenant users only, specific roles:
//   <ProtectedRoute tenantOnly roles={['hr_manager','hr_officer']}>
//     <HRManagerDashboard />
//   </ProtectedRoute>
//
//   // Tenant users only, module gate:
//   <ProtectedRoute tenantOnly module="recruitment_ats">
//     <ATSCommandCenterPage />
//   </ProtectedRoute>
//
//   // Both role + module:
//   <ProtectedRoute tenantOnly roles={['super_admin','payroll_manager']} module="payroll">
//     <PayrollProcessingPage />
//   </ProtectedRoute>
//
// eLogix Technologies · www.elogix.com.np

import { useEffect }   from 'react'
import { useAuth }     from '../../context/AuthContext.jsx'
import LoadingScreen   from '../shared/LoadingScreen.jsx'

/**
 * @param {object}    props
 * @param {string[]}  [props.roles]      - Allowed tenant roles. Omit = any authenticated user.
 * @param {string}    [props.module]     - Required module key (from resolveTenantPermissions).
 * @param {boolean}   [props.adminOnly]  - Only eLogix internal staff (elogix_* roles).
 * @param {boolean}   [props.tenantOnly] - Only tenant company users (not eLogix admin).
 * @param {string}    [props.redirect]   - Fallback redirect path. Default: '/login'.
 * @param {ReactNode} props.children
 */
export default function ProtectedRoute({
  roles,
  module,
  adminOnly  = false,
  tenantOnly = false,
  redirect   = '/login',
  children,
}) {
  const {
    isAuthenticated,
    isAdmin,
    ready,
    currentUser,
    permissions,
    getDashboardPage,
  } = useAuth()

  useEffect(() => {
    if (!ready) return

    // 1. Must be authenticated in some form
    if (!isAuthenticated && !isAdmin) {
      window.location.replace(redirect)
      return
    }

    // 2. Admin-only route — eLogix staff only (elogix-admin/*)
    if (adminOnly && !isAdmin) {
      // Tenant user tried to access eLogix admin → send to their dashboard
      window.location.replace('/' + getDashboardPage())
      return
    }

    // 3. Tenant-only route — eLogix admins should not browse tenant dashboards
    if (tenantOnly && isAdmin && !isAuthenticated) {
      window.location.replace('/elogix-admin')
      return
    }

    // 4. Role check — only for tenant users
    if (roles?.length > 0 && currentUser && !isAdmin) {
      if (!roles.includes(currentUser.role)) {
        console.warn(`[eLogix ProtectedRoute] Role "${currentUser.role}" not in allowed: [${roles.join(', ')}]`)
        window.location.replace('/' + getDashboardPage())
        return
      }
    }

    // 5. Module check — plan + biz_type + role must include this module
    if (module && permissions && !isAdmin) {
      if (!permissions.modules.includes(module)) {
        console.warn(`[eLogix ProtectedRoute] Module "${module}" not in tenant permissions. Plan: ${permissions.plan}`)
        window.location.replace('/' + getDashboardPage())
        return
      }
    }
  }, [ready, isAuthenticated, isAdmin, currentUser, permissions])

  // Still hydrating auth state — show loading to prevent flash
  if (!ready) return <LoadingScreen />

  // Not authenticated — redirect fires in useEffect, render nothing
  if (!isAuthenticated && !isAdmin) return null

  // Role/module violations — redirect fires in useEffect
  if (adminOnly && !isAdmin) return null
  if (roles?.length > 0 && currentUser && !isAdmin && !roles.includes(currentUser.role)) return null

  return children
}


// ══════════════════════════════════════════════════════════════════════
// CONVENIENCE WRAPPERS
// Use these in AppRouter.jsx for cleaner route definitions
// ══════════════════════════════════════════════════════════════════════

/**
 * Gates eLogix internal admin routes (/elogix-admin/*)
 * Maps to: src/pages/elogix-admin/ELogixAdminPage.jsx
 *          src/pages/admin/ELogixAdminPanel.jsx
 */
export function AdminRoute({ children }) {
  return <ProtectedRoute adminOnly>{children}</ProtectedRoute>
}

/**
 * Gates tenant dashboard routes with optional role + module constraints.
 * Maps to: src/components/dashboard/*.jsx
 *          src/components/dashboard/snapshots/*.jsx
 *          src/pages/company/*.jsx
 */
export function TenantRoute({ roles, module, children }) {
  return (
    <ProtectedRoute tenantOnly roles={roles} module={module}>
      {children}
    </ProtectedRoute>
  )
}

/**
 * Gates routes accessible by both eLogix admin AND tenant users.
 * E.g. billing pages, settings accessible to both.
 * Maps to: src/pages/billing/*.jsx
 */
export function AuthRoute({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

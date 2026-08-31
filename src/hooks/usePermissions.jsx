// ============================================================
// FILE: src/hooks/usePermissions.js
// PURPOSE: The frontend half of the real RBAC engine. Fetches the
// logged-in user's role's permissions from /api/v1/permissions/
// my-permissions (the database-backed permission_matrix table),
// caches them for the session, and exposes simple can() checks
// that dashboards, sidebar items, and individual buttons can call.
//
// This does NOT replace personas.js -- personas still drive which
// DASHBOARD/PERSONA a user is switched into and the page-level
// allowedPages/restrictedPages arrays. This hook adds the missing
// layer underneath: for the module the user IS in, can they view,
// edit, delete, or approve, and at what scope? That distinction
// (page visibility vs. action permission) is exactly what was
// missing -- personas.js alone could hide a whole page, but had no
// way to say "show this page, but disable the Edit button."
// ============================================================
import { useState, useEffect, useCallback, useContext, createContext } from 'react'

const PermissionsContext = createContext(null)

const EMPTY_PERM = { can_view:false, can_edit:false, can_delete:false, can_approve:false, scope:'none' }

async function fetchMyPermissions() {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) return { role: null, modules: [] }
    const res = await fetch('/api/v1/permissions/my-permissions', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return { role: null, modules: [] }
    const json = await res.json()
    return json?.data || { role: null, modules: [] }
  } catch(_e) {
    return { role: null, modules: [] }
  }
}

// ── Provider: wrap the app once (in App.jsx) so every component
// shares one fetched copy instead of each calling the API itself ──
export function PermissionsProvider({ children }) {
  const [state, setState] = useState({ role: null, byModule: {}, loading: true })

  const reload = useCallback(async () => {
    setState(s => ({ ...s, loading: true }))
    const { role, modules } = await fetchMyPermissions()
    const byModule = {}
    ;(modules || []).forEach(m => { byModule[m.module_key] = m })
    setState({ role, byModule, loading: false })
  }, [])

  useEffect(() => { reload() }, [reload])

  return (
    <PermissionsContext.Provider value={{ ...state, reload }}>
      {children}
    </PermissionsContext.Provider>
  )
}

// ── Hook: the thing every component actually calls ──
export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx) {
    // Safe fallback if used outside the provider during development --
    // denies by default rather than silently granting access.
    return {
      role: null, loading: false,
      can: () => false, scope: () => 'none', moduleAccess: () => EMPTY_PERM,
      reload: () => {},
    }
  }

  const moduleAccess = useCallback((moduleKey) => ctx.byModule[moduleKey] || EMPTY_PERM, [ctx.byModule])

  // can('payroll', 'edit') -- the single call most components need
  const can = useCallback((moduleKey, action = 'view') => {
    const perm = moduleAccess(moduleKey)
    const col = { view:'can_view', edit:'can_edit', delete:'can_delete', approve:'can_approve', report:'can_report' }[action]
    return !!perm[col]
  }, [moduleAccess])

  const scope = useCallback((moduleKey) => moduleAccess(moduleKey).scope || 'none', [moduleAccess])

  return { role: ctx.role, loading: ctx.loading, can, scope, moduleAccess, reload: ctx.reload }
}

// ── Convenience component: wrap anything that should only render
// when the user has a given permission, instead of every page
// hand-rolling its own {can(...) && <button>} check ──
export function RequirePermission({ module, action = 'view', fallback = null, children }) {
  const { can, loading } = usePermissions()
  if (loading) return null
  return can(module, action) ? children : fallback
}

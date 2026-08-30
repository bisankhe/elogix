// FILE: src/hooks/useSidebarMenu.js
// eLogix HRMS — Permission-Aware Sidebar Menu Hook
// ─────────────────────────────────────────────────────────────────────
// Integrates with:
//   src/data/sidebarMenu.js          — FULL menu tree (source of truth for all items)
//   src/data/planConfig.js           — plan → feature definitions  
//   src/data/rolePersonaMap.js       — role → persona (used by Sidebar header display)
//   src/data/personas.js             — persona definitions
//   src/context/AuthContext.jsx      — currentUser, permissions, hasModule()
//   src/hooks/usePermissions.jsx     — canAccess() for item-level checks
//   src/hooks/useTenant.js           — currentCompany for biz-type context
//   src/components/layout/Sidebar.jsx — consumes this hook
//
// HOW IT WORKS:
//   1. Reads the full menu from src/data/sidebarMenu.js
//   2. Filters sections/items through permissions.modules (resolved by tenantRouting.js)
//   3. Further filters by role restrictions on individual items
//   4. Returns only what the current user is allowed to see
//
// IMPORTANT: Do NOT put menu item data in this file.
//   All menu items belong in src/data/sidebarMenu.js.
//   This file is only the filtering logic.
//
// eLogix Technologies · www.elogix.com.np

import { useMemo }   from 'react'
import { useAuth }   from '../context/AuthContext.jsx'

// ── Import the project's existing sidebar menu data ───────────────────
// src/data/sidebarMenu.js is the single source of truth for menu items.
// Each item in that file should follow this shape:
//
// {
//   section : 'Core HR',           // section header label
//   moduleKey: 'core_hr',          // required module key (matches PLAN_MODULES / BUSINESS_SIDEBAR_PRIORITY)
//   items: [
//     {
//       id      : 'employee-dir',
//       label   : 'Employee Directory',
//       icon    : '...',            // lucide-react icon name or emoji
//       path    : '/hr/employees',  // route path
//       moduleKey: 'core_hr',       // item-level module (inherits section if omitted)
//       roles   : ['super_admin', 'hr_manager', 'hr_officer'],  // if omitted: all roles
//       badge   : null,             // e.g. 'LIVE', 'AI', number (shown as pill)
//     }
//   ]
// }
//
// If sidebarMenu.js uses a different shape, adjust the destructuring below.

import { SIDEBAR_MENU } from '../data/sidebarMenu.js'

/**
 * Returns the filtered sidebar menu for the currently logged-in user.
 * Sections/items not accessible (plan, biz-type, role) are excluded.
 *
 * @returns {Array<{ section, moduleKey, items }>}
 */
export function useSidebarMenu() {
  const { currentUser, permissions, hasModule } = useAuth()

  return useMemo(() => {
    // Not logged in or permissions not yet resolved
    if (!currentUser || !permissions) return []

    const role       = currentUser.role
    const allowedSet = new Set(permissions.modules || [])

    return SIDEBAR_MENU
      .map(section => {
        // If the section itself has a moduleKey, check it first
        if (section.moduleKey && !allowedSet.has(section.moduleKey)) return null

        const visibleItems = (section.items || []).filter(item => {
          // Item-level module gate
          const itemModule = item.moduleKey || section.moduleKey
          if (itemModule && !allowedSet.has(itemModule)) return false

          // Role gate (if item specifies allowed roles)
          if (item.roles && item.roles.length > 0) {
            if (!item.roles.includes(role)) return false
          }

          return true
        })

        // Drop empty sections
        return visibleItems.length > 0
          ? { ...section, items: visibleItems }
          : null
      })
      .filter(Boolean)
  }, [currentUser, permissions])
}

/**
 * Returns a flat list of all routes the current user can access.
 * Useful for breadcrumb generation and deep-link validation.
 *
 * @returns {Array<{ id, label, path, section }>}
 */
export function useAccessibleRoutes() {
  const menu = useSidebarMenu()
  return useMemo(() => {
    const routes = []
    for (const section of menu) {
      for (const item of section.items) {
        if (item.path) {
          routes.push({ id: item.id, label: item.label, path: item.path, section: section.section })
        }
        // Handle sub-items if sidebarMenu.js uses nested structure
        if (item.children) {
          for (const child of item.children) {
            if (child.path) {
              routes.push({ id: child.id, label: child.label, path: child.path, section: section.section })
            }
          }
        }
      }
    }
    return routes
  }, [menu])
}

/**
 * Check if the current user can navigate to a specific path.
 * Used by Topbar.jsx search and QuickDock.jsx shortcuts.
 *
 * @param {string} path - e.g. '/hr/employees'
 * @returns {boolean}
 */
export function useCanNavigateTo(path) {
  const routes = useAccessibleRoutes()
  return useMemo(
    () => routes.some(r => r.path === path),
    [routes, path]
  )
}

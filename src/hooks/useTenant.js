/**
 * FILE: src/hooks/useTenant.js
 * eLogix HRMS — Tenant Context Hook
 * Every snapshot page uses this to:
 *   - Know which company's data to show
 *   - Send correct X-Tenant-Id header on API calls
 *   - Check if user can see/edit specific modules
 *   - Show company name, currency, plan in headers
 * eLogix Technologies · www.elogix.com.np
 */
import { useContext } from 'react'
import AuthContext    from '../context/AuthContext.jsx'
import { getTenantContext, checkPermission } from '../data/rolePersonaMap.js'
import { eLogixAPI }  from '../utils/api.js'

export function useTenant() {
  // Try AuthContext first (fastest path when inside AuthProvider)
  let auth = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    auth = useContext(AuthContext)
  } catch { /* outside provider — use localStorage */ }

  const ctx = auth || {}

  // Merge with localStorage for resilience
  const ls = getTenantContext()

  const companyId   = ctx.company?.id    || ls.companyId   || null
  const tenantSlug  = ctx.tenant         || ls.tenantSlug  || ''
  const companyName = ctx.companyName    || ls.companyName || ''
  const plan        = ctx.companyPlan    || ls.plan        || 'trial'
  const currency    = ctx.company?.currency || ls.currency || 'NPR'
  const role        = ctx.role           || ls.role        || 'employee'
  const level       = ctx.level          || ls.level       || 10
  const userId      = ctx.user?.id       || ls.userId      || null
  const userName    = ctx.user?.full_name|| ls.userName    || ''
  const deptId      = ctx.deptId         || ls.deptId      || null
  const branchId    = ctx.branchId       || ls.branchId    || null
  const permissions = ctx.permissions    || ls.permissions || {}

  // Can this user perform action on module?
  const can = (module, action = 'view') =>
    checkPermission(permissions, module, action, level)

  // Is this a paid feature?
  const hasPlanFeature = (feature) => {
    const planLevels = { trial:0, starter:1, growth:2, business:3, enterprise:4, unlimited:5 }
    const featurePlans = {
      ai_tools:       2, // growth+
      advanced_reports:1, // starter+
      api_integration:3, // business+
      custom_workflows:2,
      multi_branch:   1,
      payroll:        0, // all plans
      attendance:     0,
      leave:          0,
    }
    return (planLevels[plan] || 0) >= (featurePlans[feature] || 0)
  }

  // API shortcuts pre-loaded with tenant context
  const api = {
    // All these calls automatically include X-Tenant-Id via api.js
    getSalarySheet:    (params='') => eLogixAPI.getSalarySheet?.(params) || Promise.resolve({mock:true}),
    getAttendance:     (m,d)      => eLogixAPI.getAttendance?.(m,d)      || Promise.resolve({mock:true}),
    getLeaveBalance:   (params='') => eLogixAPI.getLeaveBalance?.(params) || Promise.resolve({mock:true}),
    getRoster:         (params='') => eLogixAPI.getRoster?.(params)       || Promise.resolve({mock:true}),
    getUsers:          (params='') => eLogixAPI.getUsers(params),
    calculateTax:      (body)     => eLogixAPI.calculateSalary(body),
  }

  return {
    // Identity
    companyId, tenantSlug, companyName, plan, currency,
    role, level, userId, userName, deptId, branchId,
    // Access control
    can, hasPlanFeature, permissions,
    isSuperAdmin: level === 1,
    isHRLevel:    level <= 3,
    isDeptHead:   level === 4,
    isEmployee:   level >= 10,
    // Scope for data queries
    scope: level === 1 ? 'all'
         : level <= 3  ? 'company'
         : level === 4 ? 'department'
         : level <= 6  ? 'team'
         : 'self',
    // API
    api,
    // Display helpers
    fmtCurrency: (v) => `${currency} ${(v||0).toLocaleString('en-NP', {maximumFractionDigits:2})}`,
    fmtDate: (d) => d ? new Date(d).toLocaleDateString('en-NP') : '—',
  }
}

export default useTenant

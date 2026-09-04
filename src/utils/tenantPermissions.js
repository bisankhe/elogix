// FILE: src/utils/tenantPermissions.js
// eLogix HRMS — Tenant Permission Helpers
// Used by Sidebar and QuickDock to filter menu by tenant's plan + approved modules
// eLogix Technologies · www.elogix.com.np

import { planHasFeature } from '../data/planConfig.js'

/**
 * Get the current session slug from localStorage/sessionStorage
 */
export function getSessionSlug() {
  try {
    const sess = JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
    return sess?.company?.slug || localStorage.getItem('elogix_tenant_slug') || ''
  } catch (_e) { return '' }
}

/**
 * Get the current session company data
 */
export function getSessionCompany() {
  try {
    const sess = JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
    return sess?.company || null
  } catch (_e) { return null }
}

/**
 * Get modules granted to this tenant by eLogix SuperAdmin
 * Reads from session data — set at login time
 */
export function getTenantModules(slug) {
  try {
    const company = getSessionCompany()
    if (!company) return []
    // modules is an array of enabled module keys set by eLogix admin at approval
    return Array.isArray(company.modules) ? company.modules : []
  } catch (_e) { return [] }
}

/**
 * Resolve if a tenant user has access to a specific page/module
 * Combines plan limits + eLogix-granted module permissions
 *
 * @param {string} pageId    - The page/module ID (e.g. 'bi-dashboard')
 * @param {string} plan      - Tenant's plan (trial/starter/growth/business/enterprise)
 * @param {string[]} granted - Modules explicitly granted by eLogix admin
 * @returns {boolean}
 */
export function resolveTenantAccess(pageId, plan = 'trial', granted = []) {
  if (!pageId) return true

  // Enterprise and unlimited plans have access to everything
  if (plan === 'enterprise' || plan === 'unlimited') return true

  // Check if this module is explicitly granted
  if (granted.includes(pageId) || granted.includes('all')) return true

  // Check plan-based access
  return planHasFeature(plan, pageId)
}

/**
 * Check if current logged-in user's tenant has access to a module
 * Convenience wrapper reading from session automatically
 */
export function tenantCanAccess(pageId) {
  const company = getSessionCompany()
  if (!company) return false
  const plan    = company.plan    || 'trial'
  const granted = company.modules || []
  return resolveTenantAccess(pageId, plan, granted)
}

// ── PLAN_DEFAULT_MODULES ──────────────────────────────────────────────
// Default modules enabled for each plan tier
// Used by CompanyDashboardPage and PlanManagement to show what's included
export const PLAN_DEFAULT_MODULES = {
  trial     : ['employee-directory','live-attendance','leave-request',
               'payslip-generation','announcement-board','employee-profile'],
  starter   : ['employee-directory','live-attendance','leave-request','leave-approval',
               'payslip-generation','payroll-processing','announcement-board',
               'employee-profile','user-management','department-setup',
               'shift-setup','standard-reports','ats-dashboard'],
  growth    : ['employee-directory','live-attendance','leave-request','leave-approval',
               'payslip-generation','payroll-processing','announcement-board',
               'employee-profile','user-management','department-setup','shift-setup',
               'standard-reports','ats-dashboard','performance-dashboard',
               'goal-assignment','kpi-management','training-calendar',
               'biometric-attendance','roster-management','hr-analytics',
               'employee-engagement','ai-insights','automated-payroll',
               'salary-tax','ssf-compliance'],
  business  : ['all-growth-modules','bi-dashboard','predictive-analytics',
               'okr-management','succession-planning','lms-portal',
               'vendor-management','advanced-analytics','api-integration',
               'workflow-automation','ai-hr-analytics','ai-attrition',
               'ai-performance-insights'],
  enterprise: ['all'],
  unlimited : ['all'],
}

// ── getTenantPermissionRecord ─────────────────────────────────────────
// Returns the full permission record for the current tenant session
// Used by CompanyDashboardPage to render the permission status
export function getTenantPermissionRecord() {
  try {
    const sess = JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
    const company = sess?.company || {}
    const plan    = company?.plan || 'trial'
    const granted = Array.isArray(company?.modules) ? company.modules : []
    const defaults = PLAN_DEFAULT_MODULES[plan] || PLAN_DEFAULT_MODULES.trial

    return {
      plan,
      granted,
      defaults,
      all_modules : granted.includes('all') ? ['all'] : [...new Set([...defaults, ...granted])],
      company_id  : company?.id || null,
      company_name: company?.name || '',
      slug        : company?.slug || '',
    }
  } catch (_e) {
    return {
      plan: 'trial', granted: [], defaults: [],
      all_modules: [], company_id: null, company_name: '', slug: '',
    }
  }
}

// ── MODULE_TO_SIDEBAR ─────────────────────────────────────────────────
// Maps module keys to their sidebar section labels
// Used by RolePermissionPage to show which menu section each module belongs to
export const MODULE_TO_SIDEBAR = {
  'employee-directory'      : 'Employee Management',
  'live-attendance'         : 'Attendance',
  'attendance-processing'   : 'Attendance',
  'leave-request'           : 'Leave Management',
  'leave-approval'          : 'Leave Management',
  'payslip-generation'      : 'Payroll',
  'payroll-processing'      : 'Payroll',
  'automated-payroll'       : 'Payroll',
  'salary-tax'              : 'Payroll',
  'ssf-compliance'          : 'Payroll',
  'announcement-board'      : 'Communication',
  'employee-profile'        : 'Employee Management',
  'user-management'         : 'System Administration',
  'department-setup'        : 'Organisation Setup',
  'shift-setup'             : 'Attendance Setup',
  'standard-reports'        : 'Reports & Analytics',
  'hr-analytics'            : 'Reports & Analytics',
  'advanced-analytics'      : 'Reports & Analytics',
  'ats-dashboard'           : 'Recruitment',
  'performance-dashboard'   : 'Performance Management',
  'goal-assignment'         : 'Performance Management',
  'kpi-management'          : 'Performance Management',
  'okr-management'          : 'Performance Management',
  'training-calendar'       : 'Learning & Development',
  'lms-portal'              : 'Learning & Development',
  'biometric-attendance'    : 'Attendance',
  'roster-management'       : 'Attendance',
  'employee-engagement'     : 'Employee Experience',
  'ai-insights'             : 'AI Features',
  'ai-hr-analytics'         : 'AI Features',
  'ai-attrition'            : 'AI Features',
  'ai-performance-insights' : 'AI Features',
  'bi-dashboard'            : 'Business Intelligence',
  'predictive-analytics'    : 'Business Intelligence',
  'succession-planning'     : 'Talent Management',
  'vendor-management'       : 'Vendor Management',
  'api-integration'         : 'Integrations',
  'workflow-automation'     : 'System Administration',
}

// ── BUSINESS_TYPE_EXTRA_MODULES ───────────────────────────────────────
// Extra modules unlocked by business type regardless of plan
export const BUSINESS_TYPE_EXTRA_MODULES = {
  it_software          : ['api-integration','workflow-automation'],
  manufacturing        : ['vendor-management','field-visit-tracking'],
  healthcare           : ['compliance-management','employee-wellness'],
  education            : ['lms-portal','training-calendar'],
  hospitality          : ['roster-management','shift-setup'],
  retail               : ['roster-management','vendor-management'],
  construction         : ['field-visit-tracking','vendor-management'],
  finance_banking      : ['compliance-management','audit-logs'],
  ngo_nonprofit        : ['volunteer-management'],
  government           : ['compliance-management','audit-logs'],
  custom               : [],
}

// ── computeDefaultModules ─────────────────────────────────────────────
// Compute the full module list for a tenant based on plan + business type
export function computeDefaultModules(plan = 'trial', businessType = 'custom') {
  const planMods    = PLAN_DEFAULT_MODULES[plan] || PLAN_DEFAULT_MODULES.trial
  const extraMods   = BUSINESS_TYPE_EXTRA_MODULES[businessType] || []
  const combined    = [...new Set([...planMods, ...extraMods])]
  // 'all' means unrestricted
  if (combined.includes('all')) return ['all']
  return combined
}

// ── provisionTenantPermissions ────────────────────────────────────────
// Called after tenant approval to set up their module permissions
// Saves to backend API — tenant sees only modules they are granted
export async function provisionTenantPermissions(slug, plan, businessType, customModules = []) {
  try {
    const token = localStorage.getItem('access_token') || ''
    const computed = computeDefaultModules(plan, businessType)
    const modules  = customModules.length > 0 ? customModules : computed

    const res = await fetch('/api/internal/provision-tenant', {
      method : 'POST',
      headers: {
        'Content-Type'  : 'application/json',
        'X-Internal-Key': localStorage.getItem('elogix_admin_key') || 'elogix-admin-2026',
        'Authorization' : `Bearer ${token}`,
      },
      body: JSON.stringify({ slug, plan, business_type: businessType, modules }),
    })
    return res.ok ? await res.json() : { success: false, error: `HTTP ${res.status}` }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ── saveTenantModules ─────────────────────────────────────────────────
// Save updated module permissions for an existing tenant
export async function saveTenantModules(slug, modules = []) {
  try {
    const token = localStorage.getItem('access_token') || ''
    const res = await fetch(`/api/elogix-admin/v1/companies/${slug}/modules`, {
      method : 'PUT',
      headers: {
        'Content-Type'  : 'application/json',
        'Authorization' : `Bearer ${token}`,
        'X-Internal-Key': localStorage.getItem('elogix_admin_key') || 'elogix-admin-2026',
      },
      body: JSON.stringify({ modules }),
    })
    return res.ok ? await res.json() : { success: false, error: `HTTP ${res.status}` }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

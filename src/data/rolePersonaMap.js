/**
 * FILE: src/data/rolePersonaMap.js
 * Maps eLogix JWT role_slug → App.jsx persona id
 * When a tenant user logs in, their JWT role auto-selects their dashboard persona.
 * eLogix Technologies · www.elogix.com.np
 */

// JWT role_slug → persona id (must match PERSONAS array in personas.js)
export const ROLE_TO_PERSONA = {
  // Level 1
  super_admin:      'super-admin',
  // Level 2
  executive:        'executive',
  ceo:              'executive',
  director:         'executive',
  // Level 3
  hr_manager:       'hr',
  hr_admin:         'hr',
  // Level 3 Finance
  payroll_officer:  'finance',
  finance_officer:  'finance',
  finance_manager:  'finance',
  cfo:              'finance',
  // Level 4 IT
  it_admin:         'it-admin',
  it_manager:       'it-admin',
  // Level 4 Dept
  hod:              'department',
  department_head:  'department',
  branch_manager:   'branch',
  // Level 4 HR
  hr_officer:       'hr-officer',
  recruiter:        'recruitment-officer',
  talent_acquisition:'recruitment-officer',
  // Level 5 Ops
  admin_officer:    'admin-workspace',
  procurement:      'procurement',
  sales_manager:    'sales',
  sales_officer:    'sales',
  customer_service: 'customer-service',
  legal_officer:    'legal',
  operations_head:  'operations',
  operations_officer:'operations',
  learning_officer: 'learning-development',
  marketing_officer:'marketing',
  // Level 6
  supervisor:       'department',
  team_lead:        'department',
  manager:          'department',
  // Level 10
  employee:         'employee',
}

// Map role → default landing page (sub in App.jsx)
export const ROLE_TO_DEFAULT_PAGE = {
  super_admin:      'company-dashboard',    // Tenant super admin → company dashboard
  executive:        'executive-dashboard',
  hr_manager:       'hr-dashboard',
  hr_admin:         'hr-dashboard',
  payroll_officer:  'finance-dashboard',
  finance_officer:  'finance-dashboard',
  hod:              'department-dashboard',
  department_head:  'department-dashboard',
  branch_manager:   'branch-dashboard',
  hr_officer:       'hr-officer-dashboard',
  recruiter:        'recruitment-officer-dashboard',
  it_admin:         'it-admin-dashboard',
  admin_officer:    'admin-workspace-dashboard',
  procurement:      'procurement-dashboard',
  sales_manager:    'sales-dashboard',
  sales_officer:    'sales-dashboard',
  customer_service: 'customer-service-dashboard',
  legal_officer:    'legal-dashboard',
  operations_head:  'operations-dashboard',
  operations_officer:'operations-dashboard',
  learning_officer: 'learning-development-dashboard',
  marketing_officer:'marketing-dashboard',
  supervisor:       'department-dashboard',
  team_lead:        'department-dashboard',
  manager:          'department-dashboard',
  employee:         'employee-dashboard',
}

// Tenant company context injected into every page
export function getTenantContext() {
  try {
    const user    = JSON.parse(localStorage.getItem('elogix_user')    || 'null')
    const company = JSON.parse(localStorage.getItem('elogix_company') || 'null')
    const perms   = JSON.parse(localStorage.getItem('elogix_permissions') || '{}')
    return {
      userId:     user?.id        || null,
      empId:      user?.emp_id    || null,
      userName:   user?.full_name || '',
      userEmail:  user?.email     || '',
      role:       user?.role      || 'employee',
      level:      user?.level     || 10,
      deptId:     user?.department_id || null,
      branchId:   user?.branch_id     || null,
      companyId:  company?.id     || null,
      companyName:company?.name   || '',
      tenantSlug: company?.slug   || '',
      plan:       company?.plan   || 'trial',
      currency:   company?.currency || 'NPR',
      timezone:   company?.timezone || 'Asia/Kathmandu',
      permissions: perms,
      isAuthenticated: !!localStorage.getItem('elogix_token'),
    }
  } catch {
    return { isAuthenticated: false, role: 'employee', level: 10 }
  }
}

// Check if user can access a specific module action
export function checkPermission(permissions, module, action = 'view', level = 10) {
  if (level === 1) return true  // Super admin: all access
  const mp = permissions?.[module]
  if (mp) return !!mp[action]
  // Level-based fallback
  const levelMap = { view:4, create:3, edit:3, delete:2, approve:4, export:3 }
  return level <= (levelMap[action] || 10)
}

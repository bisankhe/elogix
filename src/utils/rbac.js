// ============================================================
// FILE: src/utils/rbac.js
// PURPOSE: Role-Based Access Control utility functions
// ============================================================

// ── Role hierarchy (higher number = more access) ─────────────
export const ROLE_HIERARCHY = {
  'super-admin': 100,
  'executive':   80,
  'hr':          70,
  'department':  50,
  'branch':      40,
  'employee':    20,
  'recruitment': 15,
}

// ── Check if role has access to a feature ───────────────────
export const hasRole = (userPersona, requiredPersona) => {
  const userLevel     = ROLE_HIERARCHY[userPersona]    || 0
  const requiredLevel = ROLE_HIERARCHY[requiredPersona] || 0
  return userLevel >= requiredLevel
}

// ── Payroll restricted personas ─────────────────────────────
export const PAYROLL_ACCESS = ['super-admin', 'executive', 'hr']
export const canViewPayroll = (persona) => PAYROLL_ACCESS.includes(persona)

// ── Pages visible per persona ────────────────────────────────
export const PERSONA_VISIBLE_PAGES = {
  'super-admin':  'all',
  'executive':    ['executive-dashboard','payroll-snapshot','performance-snapshot','engagement-snapshot','ai-insights','reports'],
  'hr':           ['hr-dashboard','attendance-snapshot','leave-snapshot','payroll-snapshot','recruitment-snapshot','performance-snapshot','engagement-snapshot'],
  'department':   ['department-dashboard','attendance-snapshot','leave-snapshot','performance-snapshot','engagement-snapshot'],
  'branch':       ['branch-dashboard','attendance-snapshot','leave-snapshot','performance-snapshot'],
  'employee':     ['employee-dashboard','my-profile','my-attendance-ess','my-leave-ess','my-payroll-ess','my-goals-kpi'],
  'recruitment':  ['recruitment-dashboard','candidate-database','ats-dashboard','interview-scheduling'],
}

// ── Check if a page is accessible ───────────────────────────
export const isPageAccessible = (persona, pageId) => {
  const pages = PERSONA_VISIBLE_PAGES[persona]
  if (!pages) return false
  if (pages === 'all') return true
  return pages.some(p => pageId.startsWith(p))
}

// ── Get display label for persona ────────────────────────────
export const getPersonaLabel = (persona, t) => {
  const labelKeys = {
    'super-admin': 'superAdmin',
    'executive':   'executive',
    'hr':          'hrManager',
    'department':  'deptHead',
    'branch':      'branchUnit',
    'employee':    'employee',
    'recruitment': 'recruitment',
  }
  const key = labelKeys[persona] || persona
  return t ? t(key) : key
}

// ── Data masking for restricted fields ──────────────────────
// Returns '****' for restricted persona
export const maskSalary = (salary, persona) => {
  if (canViewPayroll(persona)) return salary
  return '****'
}

// Mask employee ID for non-HR/Admin
export const maskEmployeeId = (empId, persona) => {
  const allowedPersonas = ['super-admin', 'hr', 'executive']
  if (allowedPersonas.includes(persona)) return empId
  return empId.replace(/\d(?=\d{4})/g, '*')
}

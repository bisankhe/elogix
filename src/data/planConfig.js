// FILE: src/data/planConfig.js
// eLogix HRMS — Plan Feature Configuration
// Defines which modules are available on each subscription plan
// eLogix Technologies · www.elogix.com.np

export const PLANS = {
  trial     : { label: 'Trial',      maxEmployees: 10,       price: 0 },
  starter   : { label: 'Starter',    maxEmployees: 50,       price: 5000 },
  growth    : { label: 'Growth',     maxEmployees: 250,      price: 12000 },
  business  : { label: 'Business',   maxEmployees: 500,      price: 25000 },
  enterprise: { label: 'Enterprise', maxEmployees: Infinity,  price: 50000 },
  unlimited : { label: 'Unlimited',  maxEmployees: Infinity,  price: 75000 },
}

// Modules available per plan (cumulative — higher plans include all lower plan modules)
const TRIAL_MODULES = [
  'employee-directory','attendance-processing','leave-request',
  'payslip-generation','employee-profile','announcement-board',
]

const STARTER_MODULES = [
  ...TRIAL_MODULES,
  'live-attendance','leave-approval','payroll-processing',
  'user-management','department-setup','shift-setup',
  'standard-reports','ats-dashboard',
]

const GROWTH_MODULES = [
  ...STARTER_MODULES,
  'performance-dashboard','goal-assignment','kpi-management',
  'training-calendar','biometric-attendance','roster-management',
  'hr-analytics','employee-engagement','ai-insights',
  'automated-payroll','salary-tax','ssf-compliance',
]

const BUSINESS_MODULES = [
  ...GROWTH_MODULES,
  'bi-dashboard','predictive-analytics','okr-management',
  'succession-planning','lms-portal','vendor-management',
  'advanced-analytics','api-integration','workflow-automation',
  'ai-hr-analytics','ai-attrition','ai-performance-insights',
]

const ENTERPRISE_MODULES = [
  ...BUSINESS_MODULES,
  'all',  // all modules
]

export const PLAN_MODULES = {
  trial     : new Set(TRIAL_MODULES),
  starter   : new Set(STARTER_MODULES),
  growth    : new Set(GROWTH_MODULES),
  business  : new Set(BUSINESS_MODULES),
  enterprise: new Set(ENTERPRISE_MODULES),
  unlimited : new Set(ENTERPRISE_MODULES),
}

/**
 * Get all modules available for a given plan
 */
export function getPlanModules(plan = 'trial') {
  return PLAN_MODULES[plan] || PLAN_MODULES.trial
}

/**
 * Check if a plan has access to a specific feature/module
 */
export function planHasFeature(plan = 'trial', feature) {
  if (!feature) return true
  const modules = getPlanModules(plan)
  return modules.has('all') || modules.has(feature)
}

/**
 * Check if a plan is at least a given level
 */
export function isPlanAtLeast(currentPlan, requiredPlan) {
  const order = ['trial','starter','growth','business','enterprise','unlimited']
  return order.indexOf(currentPlan) >= order.indexOf(requiredPlan)
}

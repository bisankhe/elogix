// FILE: src/data/planConfig.js
// eLogix HRMS — Complete SaaS Plan Configuration
// 6 Plans: Trial → Starter → Growth → Business → Enterprise → Unlimited
// Controls: features, modules, AI quota, employees, storage, add-ons
// eLogix Technologies · www.elogix.com.np

// ── Plan hierarchy (numeric — higher = more access) ──────────
export const PLAN_LEVELS = {
  trial:      0,
  starter:    1,
  growth:     2,
  business:   3,
  enterprise: 4,
  unlimited:  5,
}

// ── Full plan definitions ─────────────────────────────────────
export const PLANS = {
  trial: {
    id: 'trial', name: 'Free Trial', icon: '🎁',
    tagline: '14 days · No credit card needed',
    color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0',
    priceNPR: 0, priceUSD: 0,
    billingCycle: '14-day one-time',
    employees: 10,
    storage: '2 GB',
    aiCredits: 50,
    support: 'Email only',
    sla: 'Best effort',
    // Sidebar modules this plan unlocks
    modules: ['dashboard','hr-services'],
    // Named features
    features: {
      attendance:         true,
      leave:              true,
      employee_self_service: true,
      payroll:            false,
      ai_assistant:       false,
      recruitment:        false,
      performance:        false,
      training:           false,
      multi_branch:       false,
      custom_reports:     false,
      api_access:         false,
      white_label:        false,
      dedicated_support:  false,
      data_migration:     false,
      sso:                false,
      mobile_app:         false,
      biometric:          false,
      esewa_khalti:       false,
      custom_workflows:   false,
      advanced_analytics: false,
    },
    addons: [],
    highlight: ['10 employees max','14-day trial','Basic ESS portal','Email support'],
    limits: { payslips: 0, reports: 5, ai_queries: 50, api_calls: 0 },
  },

  starter: {
    id: 'starter', name: 'Starter', icon: '🚀',
    tagline: 'Perfect for small teams',
    color: '#0891b2', bg: '#f0f9ff', border: '#bae6fd',
    priceNPR: 5000, priceUSD: 37,
    billingCycle: 'per month',
    employees: 50,
    storage: '10 GB',
    aiCredits: 200,
    support: 'Email + Chat',
    sla: '48-hour response',
    modules: ['dashboard','ai-assistant','emp-lifecycle','workforce-ops','hr-services','reports'],
    features: {
      attendance:         true,
      leave:              true,
      employee_self_service: true,
      payroll:            true,
      ai_assistant:       true,
      recruitment:        true,
      performance:        false,
      training:           false,
      multi_branch:       false,
      custom_reports:     false,
      api_access:         false,
      white_label:        false,
      dedicated_support:  false,
      data_migration:     false,
      sso:                false,
      mobile_app:         true,
      biometric:          true,
      esewa_khalti:       true,
      custom_workflows:   false,
      advanced_analytics: false,
    },
    addons: [
      { id:'extra_emp',    name:'+50 Employees',     priceNPR:2000 },
      { id:'extra_storage',name:'+20GB Storage',     priceNPR:500  },
    ],
    highlight: ['50 employees','Payroll & SSF','AI Assistant (200 credits)','Mobile app'],
    limits: { payslips: 50, reports: 20, ai_queries: 200, api_calls: 0 },
  },

  growth: {
    id: 'growth', name: 'Growth', icon: '📈',
    tagline: 'Most popular · Growing companies',
    color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe',
    priceNPR: 12000, priceUSD: 89,
    billingCycle: 'per month',
    employees: 250,
    storage: '50 GB',
    aiCredits: 1000,
    support: 'Email + Chat + Phone',
    sla: '24-hour response',
    popular: true,
    modules: ['dashboard','ai-assistant','org-mgmt','emp-lifecycle','workforce-ops',
              'perf-talent','emp-experience','hr-services','compliance','reports'],
    features: {
      attendance:         true,
      leave:              true,
      employee_self_service: true,
      payroll:            true,
      ai_assistant:       true,
      recruitment:        true,
      performance:        true,
      training:           true,
      multi_branch:       true,
      custom_reports:     true,
      api_access:         false,
      white_label:        false,
      dedicated_support:  false,
      data_migration:     true,
      sso:                false,
      mobile_app:         true,
      biometric:          true,
      esewa_khalti:       true,
      custom_workflows:   true,
      advanced_analytics: false,
    },
    addons: [
      { id:'extra_emp',    name:'+100 Employees',    priceNPR:3000 },
      { id:'extra_ai',     name:'+500 AI Credits',   priceNPR:1500 },
      { id:'extra_storage',name:'+50GB Storage',     priceNPR:800  },
      { id:'api_access',   name:'API Access',        priceNPR:2000 },
    ],
    highlight: ['250 employees','10 HR modules','Performance & Training','Custom workflows'],
    limits: { payslips: 250, reports: 100, ai_queries: 1000, api_calls: 0 },
  },

  business: {
    id: 'business', name: 'Business', icon: '🏢',
    tagline: 'For established businesses',
    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    priceNPR: 25000, priceUSD: 185,
    billingCycle: 'per month',
    employees: 500,
    storage: '100 GB',
    aiCredits: 5000,
    support: 'Priority support + Dedicated Manager',
    sla: '8-hour response',
    modules: ['dashboard','ai-assistant','org-mgmt','emp-lifecycle','workforce-ops',
              'perf-talent','emp-experience','hr-services','finance-assets','compliance',
              'reports','sys-admin'],
    features: {
      attendance:         true,
      leave:              true,
      employee_self_service: true,
      payroll:            true,
      ai_assistant:       true,
      recruitment:        true,
      performance:        true,
      training:           true,
      multi_branch:       true,
      custom_reports:     true,
      api_access:         true,
      white_label:        false,
      dedicated_support:  true,
      data_migration:     true,
      sso:                true,
      mobile_app:         true,
      biometric:          true,
      esewa_khalti:       true,
      custom_workflows:   true,
      advanced_analytics: true,
    },
    addons: [
      { id:'extra_emp',    name:'+200 Employees',    priceNPR:5000  },
      { id:'extra_ai',     name:'+2000 AI Credits',  priceNPR:4000  },
      { id:'white_label',  name:'White Label',       priceNPR:5000  },
      { id:'extra_storage',name:'+100GB Storage',    priceNPR:1500  },
    ],
    highlight: ['500 employees','ALL 12 modules','API access','SSO & Advanced Analytics'],
    limits: { payslips: 500, reports: 999, ai_queries: 5000, api_calls: 10000 },
  },

  enterprise: {
    id: 'enterprise', name: 'Enterprise', icon: '🏛',
    tagline: 'Large organisations · Custom SLA',
    color: '#d97706', bg: '#fffbeb', border: '#fde68a',
    priceNPR: 45000, priceUSD: 333,
    billingCycle: 'per month',
    employees: 1000,
    storage: '200 GB',
    aiCredits: 20000,
    support: 'Dedicated Account Manager + On-site training',
    sla: '4-hour response · 99.9% uptime SLA',
    modules: 'all',
    features: {
      attendance:         true,
      leave:              true,
      employee_self_service: true,
      payroll:            true,
      ai_assistant:       true,
      recruitment:        true,
      performance:        true,
      training:           true,
      multi_branch:       true,
      custom_reports:     true,
      api_access:         true,
      white_label:        true,
      dedicated_support:  true,
      data_migration:     true,
      sso:                true,
      mobile_app:         true,
      biometric:          true,
      esewa_khalti:       true,
      custom_workflows:   true,
      advanced_analytics: true,
    },
    addons: [
      { id:'extra_emp',    name:'+500 Employees',    priceNPR:10000 },
      { id:'extra_ai',     name:'+10000 AI Credits', priceNPR:8000  },
      { id:'custom_dev',   name:'Custom Development',priceNPR:15000 },
      { id:'onsite',       name:'On-site Training',  priceNPR:20000 },
    ],
    highlight: ['1000 employees','All modules + White Label','On-site training','Custom SLA'],
    limits: { payslips: 1000, reports: 999, ai_queries: 20000, api_calls: 100000 },
  },

  unlimited: {
    id: 'unlimited', name: 'Unlimited', icon: '⚡',
    tagline: 'No limits · Everything included',
    color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
    priceNPR: 75000, priceUSD: 555,
    billingCycle: 'per month',
    employees: 'Unlimited',
    storage: '500 GB',
    aiCredits: 'Unlimited',
    support: 'VIP Support · Dedicated dev team · SLA guarantee',
    sla: '2-hour response · 99.99% uptime · Dedicated server',
    modules: 'all',
    features: Object.fromEntries(Object.keys({
      attendance:true,leave:true,employee_self_service:true,payroll:true,
      ai_assistant:true,recruitment:true,performance:true,training:true,
      multi_branch:true,custom_reports:true,api_access:true,white_label:true,
      dedicated_support:true,data_migration:true,sso:true,mobile_app:true,
      biometric:true,esewa_khalti:true,custom_workflows:true,advanced_analytics:true,
    }).map(k=>[k,true])),
    addons: [
      { id:'custom_dev',   name:'Custom Development',priceNPR:15000 },
      { id:'extra_storage',name:'+1TB Storage',      priceNPR:5000  },
      { id:'dr_site',      name:'Disaster Recovery', priceNPR:25000 },
    ],
    highlight: ['Unlimited employees','Unlimited AI','Dedicated server','VIP 2-hour SLA'],
    limits: { payslips: 999999, reports: 999999, ai_queries: 999999, api_calls: 999999 },
  },
}

// ── Helper: check if a plan has a feature ────────────────────
export function planHasFeature(planId, feature) {
  const plan = PLANS[planId] || PLANS.trial
  return !!plan.features[feature]
}

// ── Helper: check if plan has access to a module ─────────────
export function planHasModule(planId, moduleId) {
  const plan = PLANS[planId] || PLANS.trial
  if (plan.modules === 'all') return true
  if (Array.isArray(plan.modules)) return plan.modules.includes(moduleId)
  return false
}

// ── Helper: get all modules allowed by plan ───────────────────
export function getPlanModules(planId) {
  const plan = PLANS[planId] || PLANS.trial
  if (plan.modules === 'all') return null  // null = all modules
  return plan.modules
}

// ── Feature labels for UI ─────────────────────────────────────
export const FEATURE_LABELS = {
  attendance:           { label:'Attendance & Shifts',     icon:'⏰' },
  leave:                { label:'Leave Management',         icon:'📅' },
  employee_self_service:{ label:'Employee Self-Service',   icon:'👤' },
  payroll:              { label:'Payroll & SSF/PF/CIT',    icon:'💰' },
  ai_assistant:         { label:'AI HR Assistant',          icon:'🤖' },
  recruitment:          { label:'Recruitment & ATS',        icon:'📋' },
  performance:          { label:'Performance & KPI/OKR',    icon:'🎯' },
  training:             { label:'Training & LMS',           icon:'📚' },
  multi_branch:         { label:'Multi-Branch/Dept',        icon:'🌿' },
  custom_reports:       { label:'Custom Reports',           icon:'📊' },
  api_access:           { label:'REST API Access',          icon:'🔗' },
  white_label:          { label:'White Label / Branding',   icon:'🎨' },
  dedicated_support:    { label:'Dedicated Support Manager',icon:'🎫' },
  data_migration:       { label:'Data Migration Service',   icon:'🔄' },
  sso:                  { label:'SSO / OAuth Login',        icon:'🔐' },
  mobile_app:           { label:'Mobile App',               icon:'📱' },
  biometric:            { label:'Biometric Integration',    icon:'👁' },
  esewa_khalti:         { label:'eSewa / Khalti Payment',   icon:'💳' },
  custom_workflows:     { label:'Custom Workflows',         icon:'⚙️' },
  advanced_analytics:   { label:'Advanced Analytics & BI',  icon:'📈' },
}

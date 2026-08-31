// FILE: src/utils/helpers.js
// eLogix HRMS — Frontend Utility Functions
// Date formatting, currency, Nepal calendar (BS), validation, text helpers
// Used across all 531 pages — import what you need
// eLogix Technologies · www.elogix.com.np

// ══════════════════════════════════════════════════════════════════════
// SESSION / AUTH HELPERS
// ══════════════════════════════════════════════════════════════════════

export function getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch { return {} }
}

export function getToken() {
  return localStorage.getItem('access_token') || getSession()?.token || ''
}

export function getTenantSlug() {
  const s = getSession()
  return s?.company?.slug || localStorage.getItem('elogix_tenant_slug') || ''
}

export function getTenantHeaders() {
  const token = getToken()
  const slug  = getTenantSlug()
  return {
    'Authorization' : `Bearer ${token}`,
    'X-Tenant-Slug' : slug,
    'Content-Type'  : 'application/json',
  }
}

export function isLoggedIn() {
  return !!getToken()
}

export function getCurrentUser() {
  return getSession()?.user || null
}

export function getCurrentCompany() {
  return getSession()?.company || null
}

export function hasRole(...roles) {
  const userRole = getSession()?.user?.role || ''
  return roles.some(r => r === userRole || userRole.includes(r))
}


// ══════════════════════════════════════════════════════════════════════
// CURRENCY FORMATTING (NPR)
// ══════════════════════════════════════════════════════════════════════

export function formatNPR(amount, decimals = 0) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'NPR 0'
  const num = parseFloat(amount)
  if (isNaN(num)) return 'NPR 0'

  // Nepal uses lakh/crore system
  const abs = Math.abs(num)
  if (abs >= 10_000_000) return `NPR ${(num/10_000_000).toFixed(2)} Cr`
  if (abs >= 100_000)    return `NPR ${(num/100_000).toFixed(2)} L`

  return `NPR ${num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function formatCurrency(amount, currency = 'NPR', decimals = 0) {
  const symbols = { NPR: 'रु', USD: '$', INR: '₹', EUR: '€', GBP: '£' }
  const sym = symbols[currency] || currency
  const num = parseFloat(amount || 0)
  return `${sym}${num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}


// ══════════════════════════════════════════════════════════════════════
// DATE FORMATTING
// ══════════════════════════════════════════════════════════════════════

export function formatDate(dateStr, format = 'DD MMM YYYY') {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const fullMonths = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const pad = n => String(n).padStart(2, '0')

  return format
    .replace('MMMM', fullMonths[d.getMonth()])
    .replace('MMM',  months[d.getMonth()])
    .replace('MM',   pad(d.getMonth() + 1))
    .replace('DD',   pad(d.getDate()))
    .replace('YYYY', d.getFullYear())
    .replace('YY',   String(d.getFullYear()).slice(-2))
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${formatDate(dateStr)} ${d.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true
  })}`
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins  < 1)   return 'just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 7)   return `${days}d ago`
  return formatDate(dateStr)
}

export function daysBetween(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  return Math.ceil((e - s) / 86400000)
}

export function isToday(dateStr) {
  const d = new Date(dateStr)
  const t = new Date()
  return d.getDate() === t.getDate() &&
         d.getMonth() === t.getMonth() &&
         d.getFullYear() === t.getFullYear()
}

export function isFutureDate(dateStr) {
  return new Date(dateStr) > new Date()
}

export function currentFiscalYear() {
  // Nepal fiscal year: Shrawan 1 (mid-July) to Ashadh end (mid-July next year)
  const now  = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1  // 1-12
  return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}


// ══════════════════════════════════════════════════════════════════════
// NEPALI BIKRAM SAMBAT CALENDAR
// ══════════════════════════════════════════════════════════════════════

// AD to BS conversion (approximate — use a full BS library for production)
export function adToBS(adDate) {
  if (!adDate) return ''
  const d = new Date(adDate)
  // BS year is ~56.7 years ahead of AD
  const bsYear = d.getFullYear() + 56
  const months = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin',
                  'Kartik','Mangsir','Poush','Magh','Falgun','Chaitra']
  const bsMonth = months[(d.getMonth() + 9) % 12]
  return `${d.getDate()} ${bsMonth} ${bsYear}`
}

export function formatBSDate(adDate) {
  // Returns "2081-05-15 BS" style
  if (!adDate) return '—'
  const d = new Date(adDate)
  const bsYear = d.getFullYear() + 56
  const pad = n => String(n).padStart(2, '0')
  const bsMonth = pad(((d.getMonth() + 9) % 12) + 1)
  return `${bsYear}-${bsMonth}-${pad(d.getDate())} BS`
}


// ══════════════════════════════════════════════════════════════════════
// NUMBER HELPERS
// ══════════════════════════════════════════════════════════════════════

export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined) return '0'
  return parseFloat(num || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatPercent(value, decimals = 1) {
  const num = parseFloat(value || 0)
  if (isNaN(num)) return '0%'
  return `${num.toFixed(decimals)}%`
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function roundTo(value, decimals = 2) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}


// ══════════════════════════════════════════════════════════════════════
// STRING HELPERS
// ══════════════════════════════════════════════════════════════════════

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function titleCase(str) {
  if (!str) return ''
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

export function truncate(str, length = 50, suffix = '...') {
  if (!str || str.length <= length) return str || ''
  return str.slice(0, length) + suffix
}

export function toSlug(str) {
  return str?.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || ''
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

export function maskEmail(email = '') {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const masked = local.slice(0, 2) + '***' + local.slice(-1)
  return `${masked}@${domain}`
}

export function maskPhone(phone = '') {
  return phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
}


// ══════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS (frontend)
// ══════════════════════════════════════════════════════════════════════

export const validators = {
  required  : v => !!v?.toString().trim() || 'This field is required',
  email     : v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email address',
  phone     : v => /^(\+977)?[9][678]\d{8}$/.test(v?.replace(/\s/g, '')) || 'Invalid Nepal phone number',
  minLength : n => v => v?.length >= n || `Minimum ${n} characters required`,
  maxLength : n => v => v?.length <= n || `Maximum ${n} characters allowed`,
  positiveNum: v => (parseFloat(v) > 0) || 'Must be a positive number',
  percentage: v => (parseFloat(v) >= 0 && parseFloat(v) <= 100) || 'Must be between 0-100',
  minWageNPR: v => parseFloat(v) >= 17300 || 'Below Nepal minimum wage (NPR 17,300)',
  futureDate: v => new Date(v) > new Date() || 'Must be a future date',
  pastDate  : v => new Date(v) < new Date() || 'Must be a past date',
}


// ══════════════════════════════════════════════════════════════════════
// COLOUR / STATUS HELPERS
// ══════════════════════════════════════════════════════════════════════

export const STATUS_COLORS = {
  active   : { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  inactive : { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  pending  : { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  rejected : { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  approved : { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  suspended: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  trial    : { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  draft    : { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
}

export function getStatusStyle(status) {
  return STATUS_COLORS[status?.toLowerCase()] || STATUS_COLORS.inactive
}

export function getStatusBadge(status) {
  const style = getStatusStyle(status)
  return {
    display        : 'inline-flex',
    alignItems     : 'center',
    padding        : '2px 10px',
    borderRadius   : 20,
    fontSize       : 11,
    fontWeight     : 700,
    background     : style.bg,
    color          : style.text,
    border         : `1px solid ${style.border}`,
    textTransform  : 'uppercase',
    letterSpacing  : '0.05em',
  }
}


// ══════════════════════════════════════════════════════════════════════
// PLAN HELPERS
// ══════════════════════════════════════════════════════════════════════

export const PLAN_LIMITS = {
  trial     : { employees: 10,  modules: 5,   price: 0 },
  starter   : { employees: 50,  modules: 15,  price: 5000 },
  growth    : { employees: 250, modules: 30,  price: 12000 },
  business  : { employees: 500, modules: 47,  price: 25000 },
  enterprise: { employees: Infinity, modules: 47, price: 50000 },
}

export function getPlanLimit(plan, key) {
  return PLAN_LIMITS[plan?.toLowerCase()]?.[key] ?? 0
}

export function isPlanAllowed(plan, requiredPlan) {
  const order = ['trial','starter','growth','business','enterprise']
  return order.indexOf(plan) >= order.indexOf(requiredPlan)
}


// ══════════════════════════════════════════════════════════════════════
// LOCAL STORAGE HELPERS (tenant-safe)
// ══════════════════════════════════════════════════════════════════════

export const storage = {
  get: (key, fallback = null) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
    catch { return fallback }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)) }
    catch { /* storage full */ }
  },
  remove: key => localStorage.removeItem(key),
  clear : prefix => {
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k))
  },
}

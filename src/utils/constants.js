/**
 * FILE: src/utils/constants.js
 * NepHR Pro — Application-wide constants
 * Nepal Labour Act 2074 statutory values, UI config, enums.
 */

// ── App ───────────────────────────────────────────────────────
export const APP_NAME    = 'NepHR Pro'
export const APP_VERSION = '1.0.0'
export const API_VERSION = 'v1'

// ── Nepal Labour Act 2074 — Statutory Values ──────────────────
export const NEPAL_LA = {
  MIN_WAGE_NPR:             15000,    // Monthly minimum wage
  MIN_DAILY_WAGE_NPR:       577,      // 15000 / 26 working days
  MAX_DAILY_HOURS:          8,        // Section 28
  MAX_WEEKLY_HOURS:         48,       // Section 28
  MAX_PROBATION_MONTHS:     6,        // Section 10
  MAX_CASUAL_DAYS_MONTH:    7,        // Section 10(d)
  MAX_PARTTIME_HRS_WEEK:    35,       // Section 10(e)
  OT_MULTIPLIER_MIN:        1.5,      // Section 30
  NIGHT_PREMIUM_MIN_PCT:    15,       // Section 32 (suggested)
  WEEKLY_REST_DAYS_MIN:     1,        // Section 26
  FESTIVAL_BONUS_MONTHS:    1,        // 1 month salary
  PF_EMPLOYEE_PCT:          10,       // Provident Fund
  PF_EMPLOYER_PCT:          10,
  SSF_EMPLOYER_PCT:         3.33,     // Social Security Fund
  GRATUITY_PCT:             8.33,     // 1/12 of annual salary
  TDS_SERVICES_PCT:         1.5,      // TDS on outsource services
  CBA_THRESHOLD:            10,       // Workers → CBA required
  SAFETY_COMMITTEE_THRESH:  20,       // Workers → Safety Committee
  MATERNITY_DAYS:           98,       // 14 weeks
  PATERNITY_DAYS:           15,
  ANNUAL_LEAVE_DAYS:        18,
  SICK_LEAVE_DAYS:          12,
}

// ── Employment Categories ─────────────────────────────────────
export const EMP_CATEGORIES = {
  REG:         { code: 'REG',        name: 'Regular / Permanent',    la: 'Section 10(a)', color: '#10b981' },
  PROB:        { code: 'PROB',       name: 'Probation',              la: 'Section 10',    color: '#f59e0b' },
  CONTRACT_TB: { code: 'CONTRACT-TB',name: 'Time-Based Contract',    la: 'Section 10(c)', color: '#06b6d4' },
  CONTRACT_WB: { code: 'CONTRACT-WB',name: 'Work-Based Contract',    la: 'Section 10(b)', color: '#8b5cf6' },
  CASUAL:      { code: 'CASUAL',     name: 'Casual',                 la: 'Section 10(d)', color: '#ef4444' },
  PART_TIME:   { code: 'PT',         name: 'Part-Time',              la: 'Section 10(e)', color: '#84cc16' },
  INTERN:      { code: 'INTERN',     name: 'Intern',                 la: 'N/A',           color: '#a78bfa' },
  TRAINEE:     { code: 'TRAINEE',    name: 'Trainee',                la: 'Section 10',    color: '#d946ef' },
  DAILY_WAGE:  { code: 'DW',         name: 'Daily Wage',             la: 'Section 10(d)', color: '#f97316' },
  OUTSOURCE:   { code: 'OUT',        name: 'Outsource',              la: 'Section 52-60', color: '#dc2626' },
  CONSULTANT:  { code: 'CONSULT',    name: 'Consultant',             la: 'Service Agmt',  color: '#64748b' },
}

// ── Shift Types ───────────────────────────────────────────────
export const SHIFT_TYPES = {
  day:        { label: 'Day Shift',         icon: '☀',  color: '#3b82f6' },
  morning:    { label: 'Morning Shift',     icon: '🌅', color: '#f59e0b' },
  evening:    { label: 'Evening Shift',     icon: '🌆', color: '#8b5cf6' },
  night:      { label: 'Night Shift',       icon: '🌙', color: '#1e40af' },
  rotational: { label: 'Rotational Shift',  icon: '🔄', color: '#10b981' },
  flexible:   { label: 'Flexible Shift',    icon: '⏰', color: '#06b6d4' },
  split:      { label: 'Split Shift',       icon: '⏸', color: '#ec4899' },
}

// ── Nepal Provinces ───────────────────────────────────────────
export const NEPAL_PROVINCES = [
  { id: 1, name: 'Koshi Province',          nepali: 'कोशी प्रदेश',       headquarters: 'Biratnagar' },
  { id: 2, name: 'Madhesh Province',         nepali: 'मधेश प्रदेश',      headquarters: 'Janakpur' },
  { id: 3, name: 'Bagmati Province',         nepali: 'बागमती प्रदेश',    headquarters: 'Hetauda' },
  { id: 4, name: 'Gandaki Province',         nepali: 'गण्डकी प्रदेश',    headquarters: 'Pokhara' },
  { id: 5, name: 'Lumbini Province',         nepali: 'लुम्बिनी प्रदेश',  headquarters: 'Butwal' },
  { id: 6, name: 'Karnali Province',         nepali: 'कर्णाली प्रदेश',   headquarters: 'Birendranagar' },
  { id: 7, name: 'Sudurpashchim Province',   nepali: 'सुदूरपश्चिम प्रदेश',headquarters: 'Dhangadhi' },
]

// ── Nepal Labour Office Zones ─────────────────────────────────
export const LABOUR_OFFICES = [
  'Bagmati Zone (Kathmandu)',
  'Gandaki Zone (Pokhara)',
  'Lumbini Zone (Butwal)',
  'Koshi Zone (Biratnagar)',
  'Mechi Zone (Ilam)',
  'Sagarmatha Zone (Rajbiraj)',
  'Janakpur Zone (Janakpur)',
  'Narayani Zone (Hetauda)',
  'Bheri Zone (Nepalgunj)',
  'Seti Zone (Dhangadhi)',
  'Mahakali Zone (Mahendranagar)',
  'Karnali Zone (Surkhet)',
  'Rapti Zone (Tulsipur)',
  'Dhaulagiri Zone (Baglung)',
]

// ── Industry Sectors ──────────────────────────────────────────
export const INDUSTRY_SECTORS = [
  'Banking & Finance', 'Insurance', 'Manufacturing', 'IT & Technology',
  'Telecommunications', 'Healthcare & Pharmaceuticals', 'Education',
  'Retail & Consumer Goods', 'Real Estate & Construction',
  'Hospitality & Tourism', 'Media & Entertainment', 'NGO / INGO',
  'Government & Public Sector', 'Agriculture', 'Energy & Utilities',
  'Logistics & Supply Chain', 'Legal & Professional Services',
  'Consulting', 'Food & Beverage', 'Automobile', 'Other',
]

// ── Company Registration Types ────────────────────────────────
export const REG_TYPES = [
  'private_limited', 'public_limited', 'partnership',
  'proprietorship', 'ngo', 'ingo', 'cooperative', 'government',
]

// ── Ulrich HR Model ───────────────────────────────────────────
export const ULRICH_TYPES = {
  strategic_hrbp:      { label: 'Strategic HRBP',    short: 'HRBP', color: '#8b5cf6' },
  shared_services:     { label: 'HR Shared Services', short: 'HRSS', color: '#3b82f6' },
  center_of_excellence:{ label: 'Center of Excellence',short: 'CoE', color: '#10b981' },
  line_management:     { label: 'Line Management',    short: 'LM',   color: '#f59e0b' },
  functional:          { label: 'Functional',          short: 'FUNC', color: '#64748b' },
}

// ── Position Status ───────────────────────────────────────────
export const POSITION_STATUS = {
  vacant:   { label: 'Vacant',    color: '#ef4444', bg: '#fef2f2' },
  filled:   { label: 'Filled',    color: '#10b981', bg: '#f0fdf4' },
  on_hold:  { label: 'On Hold',   color: '#f59e0b', bg: '#fffbeb' },
  budgeted: { label: 'Budgeted',  color: '#3b82f6', bg: '#eff6ff' },
  eliminated:{ label:'Eliminated',color: '#94a3b8', bg: '#f1f5f9' },
}

// ── Risk Levels ───────────────────────────────────────────────
export const RISK_LEVELS = {
  low:      { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', label: 'Low Risk' },
  medium:   { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Medium' },
  high:     { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'High Risk' },
  critical: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: 'Critical' },
}

// ── Holiday Types ─────────────────────────────────────────────
export const HOLIDAY_TYPES = {
  statutory:  { color: '#dc2626', label: 'Statutory' },
  cultural:   { color: '#f59e0b', label: 'Cultural' },
  optional:   { color: '#10b981', label: 'Optional' },
  floating:   { color: '#8b5cf6', label: 'Floating' },
  restricted: { color: '#64748b', label: 'Restricted' },
}

// ── Nepali BS Calendar Months ─────────────────────────────────
export const BS_MONTHS = [
  'Baisakh (बैशाख)',  'Jestha (जेठ)',      'Ashadh (असार)',
  'Shrawan (साउन)',   'Bhadra (भाद्र)',    'Ashwin (असोज)',
  'Kartik (कार्तिक)','Mangsir (मंसिर)',   'Poush (पुस)',
  'Magh (माघ)',       'Falgun (फागुन)',    'Chaitra (चैत)',
]

// ── Days of Week ──────────────────────────────────────────────
export const DAYS_OF_WEEK = [
  { index: 0, name: 'Sunday',    nepali: 'आइतबार', short: 'Sun' },
  { index: 1, name: 'Monday',    nepali: 'सोमबार',  short: 'Mon' },
  { index: 2, name: 'Tuesday',   nepali: 'मंगलबार', short: 'Tue' },
  { index: 3, name: 'Wednesday', nepali: 'बुधबार',  short: 'Wed' },
  { index: 4, name: 'Thursday',  nepali: 'बिहिबार', short: 'Thu' },
  { index: 5, name: 'Friday',    nepali: 'शुक्रबार',short: 'Fri' },
  { index: 6, name: 'Saturday',  nepali: 'शनिबार',  short: 'Sat' },
]

// ── Vendor Service Categories (LA 2074 permitted) ─────────────
export const VENDOR_SERVICES = [
  'Security Services', 'Housekeeping & Sanitation', 'IT Support Staff',
  'Cafeteria & Catering', 'Driver & Transport', 'Gardening & Landscaping',
  'Call Center Support', 'Business Assistance', 'Maintenance & Repair',
  'Parking Management', 'Event Support', 'Other Non-Core Service',
]

// ── Invoice Status ────────────────────────────────────────────
export const INVOICE_STATUS = {
  draft:            { label: 'Draft',           color: '#94a3b8', bg: '#f1f5f9' },
  submitted:        { label: 'Submitted',        color: '#3b82f6', bg: '#eff6ff' },
  pending_approval: { label: 'Pending Approval', color: '#f59e0b', bg: '#fffbeb' },
  approved:         { label: 'Approved',         color: '#8b5cf6', bg: '#f5f3ff' },
  disputed:         { label: 'Disputed',         color: '#ef4444', bg: '#fef2f2' },
  paid:             { label: 'Paid',             color: '#10b981', bg: '#f0fdf4' },
  rejected:         { label: 'Rejected',         color: '#dc2626', bg: '#fef2f2' },
}

// ── Pagination defaults ───────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE:     1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE:     100,
  PER_PAGE_OPTIONS: [10, 20, 50, 100],
}

// ── Persona roles ─────────────────────────────────────────────
export const PERSONAS = {
  super_admin:        { label: 'Super Admin',       icon: '👑', color: '#7c3aed' },
  executive:          { label: 'Executive',          icon: '💼', color: '#0369a1' },
  hr_manager:         { label: 'HR Manager',         icon: '👩‍💼', color: '#0f766e' },
  department_head:    { label: 'Department Head',    icon: '🏢', color: '#b45309' },
  branch_manager:     { label: 'Branch Manager',     icon: '🏬', color: '#6d28d9' },
  employee:           { label: 'Employee',           icon: '👤', color: '#475569' },
  recruitment_manager:{ label: 'Recruitment Manager',icon: '🎯', color: '#be185d' },
}

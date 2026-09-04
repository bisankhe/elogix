// FILE: CompanySetupPage.jsx — Company Setup with Multi-Country Financial Year Config
// Country selection triggers auto-fill of: FY Pattern, Leave Year, Currency,
// Language, Calendar, Timezone, Weekend, OT Rates, Number Format, Date Format
import React, { useState, useRef, useEffect } from 'react'

// ── COUNTRY MASTER CONFIG ─────────────────────────────────────────────────────
const COUNTRY_CONFIGS = {
  'Nepal': {
    flag:'🇳🇵', region:'South Asia',
    currency:'NPR — Nepalese Rupee', currency_code:'NPR', currency_symbol:'रू',
    fy_pattern:'Shrawan–Ashad (Mid-July to Mid-July)',
    fy_start:'1 Shrawan (mid-July)',   fy_end:'32 Ashad (mid-July)',
    fy_example:'FY 2081-82 (BS) = July 2024 – July 2025 (AD)',
    fy_note:'Nepal uses Bikram Sambat (BS) calendar. Fiscal year runs with BS year.',
    calendar:'Bikram Sambat (BS) Primary + Gregorian (AD) Secondary',
    leave_year:'Same as Financial Year (Shrawan 1 – Ashad End)',
    leave_year_note:'Labour Act 2074: leave year follows FY. Annual leave 18 days, sick 12 days, festival 13 days.',
    carry_forward:'No carry forward — expires end of leave year',
    encashment:'Allowed on exit only',
    official_lang:'Nepali (नेपाली)', interface_lang:'English',
    letter_lang:'Nepali', extra_langs:['English','Nepali'],
    date_format:'DD/MM/YYYY (BS/AD)', time_format:'12-hour (AM/PM)',
    timezone:'Asia/Kathmandu (NPT +5:45)', timezone_offset:'+05:45',
    number_format:'1,00,000.00 (Lakh system)',
    weekend:['Saturday'], payroll_cycle:'Monthly (BS calendar)',
    ot_weekday:'1.5× base rate', ot_weekend:'2.0× base rate',
    ot_max_daily:'4 hours', ot_max_weekly:'24 hours',
    min_wage:'NPR 15,000 / month',
    tax_year:'Shrawan 1 – Ashad End (same as FY)',
    income_tax:'Slab rate — IRD',
    social_security:'SSF (Social Security Fund) — 11% Employee + 20% Employer',
    labour_act:'Nepal Labour Act 2074 (2017 AD)',
    compliance:'Nepal Companies Act 2063 · Labour Act 2074 · IRD · SSF · PAN/VAT',
    holiday_authority:'Nepal Government / Ministry of Labour',
    max_foreign_workers:'5% of total workforce (Labour Act 2074 Section 6)',
    probation_max:'6 months (Labour Act 2074 Section 10)',
    notice_period:'30 days (probation) / 3 months (permanent)',
    gratuity:'1 month per year after 1 year service',
    ssf_applicable:true,
    dual_calendar_note:'BS calendar used for salary periods, AD calendar for correspondence.',
  },
  'India': {
    flag:'🇮🇳', region:'South Asia',
    currency:'INR — Indian Rupee', currency_code:'INR', currency_symbol:'₹',
    fy_pattern:'April – March',
    fy_start:'1 April',   fy_end:'31 March',
    fy_example:'FY 2024-25 = 1 Apr 2024 – 31 Mar 2025',
    fy_note:'India FY runs April to March. Used for all corporate and tax purposes.',
    calendar:'Gregorian (AD)',
    leave_year:'Calendar Year (Jan 1 – Dec 31) or FY-aligned (company choice)',
    leave_year_note:'Varies by state. Many companies align to calendar year.',
    carry_forward:'Carry forward up to max cap (varies by state)',
    encashment:'Allowed annually for excess / on exit',
    official_lang:'Hindi (हिन्दी) + English', interface_lang:'English',
    letter_lang:'English', extra_langs:['Hindi','English'],
    date_format:'DD/MM/YYYY', time_format:'12-hour (AM/PM)',
    timezone:'Asia/Kolkata (IST +5:30)', timezone_offset:'+05:30',
    number_format:'1,00,000.00 (Lakh system)',
    weekend:['Sunday'], payroll_cycle:'Monthly',
    ot_weekday:'2× base rate (Factories Act)', ot_weekend:'2× base rate',
    ot_max_daily:'Varies by state', ot_max_weekly:'As per Factories Act',
    min_wage:'State-wise minimum wage',
    tax_year:'April 1 – March 31',
    income_tax:'Slab rate — Income Tax Act 1961',
    social_security:'PF (12% + 12%), ESI (0.75% Employee + 3.25% Employer)',
    labour_act:'Factories Act 1948 / New Labour Codes 2020',
    compliance:'Companies Act 2013 · Factories Act 1948 · PF Act · ESI Act',
    holiday_authority:'Central / State Government',
    max_foreign_workers:'As per visa and sector policy',
    probation_max:'6 months (common practice)',
    notice_period:'As per employment contract',
    gratuity:'15 days per year after 5 years service (Payment of Gratuity Act)',
    ssf_applicable:false,
    dual_calendar_note:'',
  },
  'United States': {
    flag:'🇺🇸', region:'North America',
    currency:'USD — US Dollar', currency_code:'USD', currency_symbol:'$',
    fy_pattern:'January – December (Calendar Year) or Custom',
    fy_start:'1 January',   fy_end:'31 December',
    fy_example:'FY 2025 = Jan 1 – Dec 31, 2025',
    fy_note:'Most US companies use calendar year FY. Federal government: Oct–Sep.',
    calendar:'Gregorian (AD)',
    leave_year:'Calendar Year (Jan 1 – Dec 31) or Employee Anniversary Year',
    leave_year_note:'PTO policies vary widely. FMLA provides 12 weeks unpaid family/medical leave.',
    carry_forward:'Full carry forward (company policy) or Use-it-or-lose-it',
    encashment:'State-dependent',
    official_lang:'English', interface_lang:'English',
    letter_lang:'English', extra_langs:['English','Spanish'],
    date_format:'MM/DD/YYYY', time_format:'12-hour (AM/PM)',
    timezone:'America/New_York (EST/EDT −5/−4)', timezone_offset:'-05:00',
    number_format:'1,000,000.00 (International)',
    weekend:['Saturday','Sunday'], payroll_cycle:'Bi-weekly (26 payrolls/year)',
    ot_weekday:'1.5× over 40 hrs/week (FLSA)', ot_weekend:'1.5× if over 40 hrs week',
    ot_max_daily:'No federal daily OT cap', ot_max_weekly:'OT after 40 hrs/week',
    min_wage:'Federal $7.25/hr (state minimums vary)',
    tax_year:'January 1 – December 31',
    income_tax:'Federal + State income tax',
    social_security:'Social Security 6.2% + Medicare 1.45% (employer matches)',
    labour_act:'Fair Labor Standards Act (FLSA) 1938',
    compliance:'FLSA · FMLA · ADA · Title VII · State Labour Laws',
    holiday_authority:'Federal Government / State',
    max_foreign_workers:'H-1B and other visa categories — per USCIS',
    probation_max:'At-will employment (no formal probation)',
    notice_period:'At-will (usually 2 weeks)',
    gratuity:'No statutory gratuity',
    ssf_applicable:false,
    dual_calendar_note:'',
  },
  'United Kingdom': {
    flag:'🇬🇧', region:'Europe',
    currency:'GBP — Pound Sterling', currency_code:'GBP', currency_symbol:'£',
    fy_pattern:'April – March (Tax Year: 6 April – 5 April)',
    fy_start:'6 April',   fy_end:'5 April',
    fy_example:'FY 2024/25 = 6 Apr 2024 – 5 Apr 2025',
    fy_note:'UK tax year runs 6 Apr–5 Apr (historic quirk). Corporate FY can be any 12-month period.',
    calendar:'Gregorian (AD)',
    leave_year:'April 6 – April 5 (tax year aligned)',
    leave_year_note:'28 days statutory minimum (including bank holidays) per Working Time Regulations 1998.',
    carry_forward:'Up to 4 weeks carry forward (statutory)',
    encashment:'On termination only (statutory minimum)',
    official_lang:'English', interface_lang:'English',
    letter_lang:'English', extra_langs:['English','Welsh'],
    date_format:'DD/MM/YYYY', time_format:'12-hour (AM/PM)',
    timezone:'Europe/London (GMT/BST +0/+1)', timezone_offset:'+00:00',
    number_format:'1,000,000.00 (International)',
    weekend:['Saturday','Sunday'], payroll_cycle:'Monthly or Weekly',
    ot_weekday:'As per contract (no statutory OT rate)', ot_weekend:'As per contract',
    ot_max_daily:'No statutory daily limit', ot_max_weekly:'48 hrs avg (Working Time Regs)',
    min_wage:'£11.44/hr (2024 — National Living Wage 21+)',
    tax_year:'6 April – 5 April',
    income_tax:'PAYE (Pay As You Earn) — HMRC',
    social_security:'National Insurance (NI) — 8% Employee + 13.8% Employer',
    labour_act:'Employment Rights Act 1996',
    compliance:'ERA 1996 · Working Time Regulations 1998 · HMRC PAYE · IR35',
    holiday_authority:'UK Government (Bank Holidays)',
    max_foreign_workers:'Skilled Worker Visa — UKVI',
    probation_max:'Common 3–6 months (no statutory limit)',
    notice_period:'Statutory: 1 week per year, max 12 weeks',
    gratuity:'No statutory gratuity',
    ssf_applicable:false,
    dual_calendar_note:'',
  },
  'Australia': {
    flag:'🇦🇺', region:'Oceania',
    currency:'AUD — Australian Dollar', currency_code:'AUD', currency_symbol:'A$',
    fy_pattern:'July – June',
    fy_start:'1 July',   fy_end:'30 June',
    fy_example:'FY 2024-25 = 1 Jul 2024 – 30 Jun 2025',
    fy_note:'Australia FY runs July to June. ATO financial year for tax purposes.',
    calendar:'Gregorian (AD)',
    leave_year:'July 1 – June 30 (FY-aligned)',
    leave_year_note:'4 weeks annual leave per year (NES). 10 days personal/carers leave.',
    carry_forward:'Full carry forward (no expiry under NES)',
    encashment:'On termination; some states allow cashing out with agreement',
    official_lang:'English', interface_lang:'English',
    letter_lang:'English', extra_langs:['English'],
    date_format:'DD/MM/YYYY', time_format:'12-hour (AM/PM)',
    timezone:'Australia/Sydney (AEST/AEDT +10/+11)', timezone_offset:'+10:00',
    number_format:'1,000,000.00 (International)',
    weekend:['Saturday','Sunday'], payroll_cycle:'Weekly, Fortnightly, or Monthly',
    ot_weekday:'1.5× first 2hrs, then 2× (varies by award)', ot_weekend:'2× (Saturday) / 2.5× (Sunday)',
    ot_max_daily:'No statutory limit (reasonable additional hours)', ot_max_weekly:'38 hrs ordinary + reasonable OT',
    min_wage:'A$23.23/hr (2024 — National Minimum Wage)',
    tax_year:'1 July – 30 June',
    income_tax:'ATO income tax + Medicare Levy 2%',
    social_security:'Superannuation 11.5% (employer contribution)',
    labour_act:'Fair Work Act 2009',
    compliance:'Fair Work Act 2009 · NES · Modern Awards · ATO Superannuation',
    holiday_authority:'Federal / State Government',
    max_foreign_workers:'Visa-dependent (TSS, Employer Nomination, Skills in Demand)',
    probation_max:'6 months (or 12 months for small business — qualifying period)',
    notice_period:'1–4 weeks depending on length of service',
    gratuity:'No statutory gratuity (covered by Superannuation)',
    ssf_applicable:false,
    dual_calendar_note:'',
  },
  'Singapore': {
    flag:'🇸🇬', region:'Southeast Asia',
    currency:'SGD — Singapore Dollar', currency_code:'SGD', currency_symbol:'S$',
    fy_pattern:'April – March or January – December (company choice)',
    fy_start:'1 January (most common)',   fy_end:'31 December',
    fy_example:'FY 2025 = 1 Jan – 31 Dec 2025',
    fy_note:'No statutory FY requirement. Most companies use calendar year.',
    calendar:'Gregorian (AD)',
    leave_year:'Calendar Year or Employee Anniversary Year',
    leave_year_note:'7–14 days annual leave (increasing with service) per Employment Act.',
    carry_forward:'Up to unused leave (company policy)',
    encashment:'On termination',
    official_lang:'English (Primary)', interface_lang:'English',
    letter_lang:'English', extra_langs:['English','Mandarin','Malay','Tamil'],
    date_format:'DD/MM/YYYY', time_format:'12-hour (AM/PM)',
    timezone:'Asia/Singapore (SGT +8:00)', timezone_offset:'+08:00',
    number_format:'1,000,000.00 (International)',
    weekend:['Saturday','Sunday'], payroll_cycle:'Monthly (within 7 days of month end)',
    ot_weekday:'1.5× basic rate', ot_weekend:'1.5× basic rate',
    ot_max_daily:'No statutory daily limit', ot_max_weekly:'44 hrs ordinary; 72 hrs max with OT',
    min_wage:'Progressive Wage Model (sector-specific)',
    tax_year:'January 1 – December 31',
    income_tax:'Flat / slab rate — IRAS',
    social_security:'CPF (Central Provident Fund) — up to 17% Employer + 20% Employee',
    labour_act:'Employment Act (Cap.91)',
    compliance:'Employment Act · CPF Act · MOM Regulations · PDPA',
    holiday_authority:'Ministry of Manpower (MOM)',
    max_foreign_workers:'Dependency Ratio Ceiling (sector-based)',
    probation_max:'3–6 months (common practice)',
    notice_period:'1 day–1 month depending on service',
    gratuity:'No statutory gratuity',
    ssf_applicable:false,
    dual_calendar_note:'',
  },
  'UAE': {
    flag:'🇦🇪', region:'Middle East',
    currency:'AED — UAE Dirham', currency_code:'AED', currency_symbol:'د.إ',
    fy_pattern:'January – December (Calendar Year)',
    fy_start:'1 January',   fy_end:'31 December',
    fy_example:'FY 2025 = 1 Jan – 31 Dec 2025',
    fy_note:'UAE uses calendar year for corporate tax (introduced 2023). No income tax on individuals.',
    calendar:'Gregorian (AD) Primary; Hijri (Islamic) for holidays and events',
    leave_year:'Calendar Year or Employee Joining Anniversary',
    leave_year_note:'30 calendar days annual leave per year (after 1 year service).',
    carry_forward:'Max 30 days carry forward',
    encashment:'End of service gratuity in lieu of unused leave',
    official_lang:'Arabic (عربي)', interface_lang:'English',
    letter_lang:'Arabic / English', extra_langs:['Arabic','English'],
    date_format:'DD/MM/YYYY', time_format:'12-hour (AM/PM)',
    timezone:'Asia/Dubai (GST +4:00)', timezone_offset:'+04:00',
    number_format:'1,000,000.00 (International)',
    weekend:['Saturday','Sunday'], payroll_cycle:'Monthly (WPS — Wage Protection System)',
    ot_weekday:'1.25× basic rate', ot_weekend:'1.5× basic rate',
    ot_max_daily:'2 hours over 8 hrs/day', ot_max_weekly:'48 hrs/week max',
    min_wage:'No federal minimum wage (sector minimums apply)',
    tax_year:'January 1 – December 31',
    income_tax:'No personal income tax; 9% corporate tax on profit > AED 375,000 (2023)',
    social_security:'GPSSA for UAE nationals (employer 15% + employee 5%); None for expats',
    labour_act:'UAE Labour Law (Federal Law No. 33 of 2021)',
    compliance:'Federal Law 33/2021 · WPS · GPSSA · UAE Corporate Tax',
    holiday_authority:'UAE Federal Government',
    max_foreign_workers:'No cap (most UAE workforce is expatriate)',
    probation_max:'6 months',
    notice_period:'30–90 days depending on contract',
    gratuity:'21 days/year (first 5 yrs) then 30 days/year after; capped at 2 years salary',
    ssf_applicable:false,
    dual_calendar_note:'Hijri calendar used for determining Islamic public holidays.',
  },
  'Bangladesh': {
    flag:'🇧🇩', region:'South Asia',
    currency:'BDT — Bangladeshi Taka', currency_code:'BDT', currency_symbol:'৳',
    fy_pattern:'July – June',
    fy_start:'1 July',   fy_end:'30 June',
    fy_example:'FY 2024-25 = 1 Jul 2024 – 30 Jun 2025',
    fy_note:'Bangladesh national budget and FY run July to June.',
    calendar:'Gregorian (AD) Primary; Bengali Calendar secondary',
    leave_year:'Calendar Year (January 1 – December 31)',
    leave_year_note:'Bangladesh Labour Act 2006: 1 day leave per 18 working days (casual: 10 days, sick: 14 days).',
    carry_forward:'Allowed (BLA 2006)',
    encashment:'On termination',
    official_lang:'Bengali (বাংলা)', interface_lang:'English',
    letter_lang:'Bengali', extra_langs:['Bengali','English'],
    date_format:'DD/MM/YYYY', time_format:'12-hour (AM/PM)',
    timezone:'Asia/Dhaka (BST +6:00)', timezone_offset:'+06:00',
    number_format:'1,00,000.00 (Lakh system)',
    weekend:['Friday','Saturday'], payroll_cycle:'Monthly',
    ot_weekday:'2× ordinary wage', ot_weekend:'2× ordinary wage',
    ot_max_daily:'2 hrs (factory); 3 hrs (with Labour Directorate approval)', ot_max_weekly:'10 hrs/week',
    min_wage:'BDT 12,500/month (garments 2023); sector-specific',
    tax_year:'July 1 – June 30',
    income_tax:'Slab rate — NBR',
    social_security:'Workers Profit Participation Fund (WPPF) 5% of net profit',
    labour_act:'Bangladesh Labour Act 2006 (amended 2013, 2018)',
    compliance:'Bangladesh Labour Act 2006 · BLA 2018 · NBR tax',
    holiday_authority:'Bangladesh Government',
    max_foreign_workers:'Work permit required; sector-dependent limits',
    probation_max:'3 months (6 months for skilled workers) per BLA',
    notice_period:'60 days (after 1 year permanent service)',
    gratuity:'30 days wages per year after 10 years service',
    ssf_applicable:false,
    dual_calendar_note:'Bengali calendar used for cultural events; Gregorian for official records.',
  },
  'Germany': {
    flag:'🇩🇪', region:'Europe',
    currency:'EUR — Euro', currency_code:'EUR', currency_symbol:'€',
    fy_pattern:'January – December (Calendar Year)',
    fy_start:'1 January',   fy_end:'31 December',
    fy_example:'FY 2025 = 1 Jan – 31 Dec 2025',
    fy_note:'Germany uses calendar year for both corporate and personal tax.',
    calendar:'Gregorian (AD)',
    leave_year:'Calendar Year (January 1 – December 31)',
    leave_year_note:'20 days minimum statutory annual leave (Bundesurlaubsgesetz). Most employers offer 25–30 days.',
    carry_forward:'Up to 31 March of following year (statutory)',
    encashment:'On termination',
    official_lang:'German (Deutsch)', interface_lang:'English',
    letter_lang:'German', extra_langs:['German','English'],
    date_format:'DD.MM.YYYY', time_format:'24-hour',
    timezone:'Europe/Berlin (CET/CEST +1/+2)', timezone_offset:'+01:00',
    number_format:'1.000.000,00 (European)',
    weekend:['Saturday','Sunday'], payroll_cycle:'Monthly',
    ot_weekday:'As per collective agreement (Tarifvertrag)', ot_weekend:'125%–150% common',
    ot_max_daily:'10 hours max (Arbeitszeitgesetz)', ot_max_weekly:'48 hrs avg over 6 months',
    min_wage:'€12.41/hr (2024)',
    tax_year:'January 1 – December 31',
    income_tax:'Lohnsteuer (wage tax) — progressive 0%–45%',
    social_security:'~20% each employer/employee (health, pension, unemployment, care)',
    labour_act:'Arbeitszeitgesetz (ArbZG) + Kündigungsschutzgesetz (KSchG)',
    compliance:'ArbZG · BDSG (GDPR) · BetrVG · SGB IV Social Law',
    holiday_authority:'Federal / State Government',
    max_foreign_workers:'EU freedom of movement; non-EU needs work permit',
    probation_max:'6 months',
    notice_period:'4 weeks to end of month (up to 7 months after 20 years)',
    gratuity:'No statutory gratuity',
    ssf_applicable:false,
    dual_calendar_note:'',
  },
  'Canada': {
    flag:'🇨🇦', region:'North America',
    currency:'CAD — Canadian Dollar', currency_code:'CAD', currency_symbol:'C$',
    fy_pattern:'January – December (Calendar Year)',
    fy_start:'1 January',   fy_end:'31 December',
    fy_example:'FY 2025 = 1 Jan – 31 Dec 2025',
    fy_note:'Canadian personal tax year is calendar year. Corporate FY can be any 53-week period.',
    calendar:'Gregorian (AD)',
    leave_year:'Calendar Year or Anniversary Year',
    leave_year_note:'2 weeks minimum (federally), up to 3 weeks after 5 years; varies by province.',
    carry_forward:'Province-dependent',
    encashment:'On termination',
    official_lang:'English / French (bilingual)', interface_lang:'English',
    letter_lang:'English / French', extra_langs:['English','French'],
    date_format:'DD/MM/YYYY or YYYY-MM-DD (ISO common)', time_format:'12-hour (AM/PM)',
    timezone:'America/Toronto (EST/EDT −5/−4)', timezone_offset:'-05:00',
    number_format:'1,000,000.00 (International)',
    weekend:['Saturday','Sunday'], payroll_cycle:'Bi-weekly or Semi-monthly',
    ot_weekday:'1.5× over 44 hrs/week (federal)', ot_weekend:'1.5× if over threshold',
    ot_max_daily:'No federal daily limit (some provinces have 8 hr threshold)', ot_max_weekly:'44 hrs/week (federal)',
    min_wage:'C$17.30/hr (federal, 2024; provinces vary)',
    tax_year:'January 1 – December 31',
    income_tax:'Federal + Provincial income tax — CRA',
    social_security:'CPP (5.95% employee + 5.95% employer) + EI',
    labour_act:'Canada Labour Code (federal) / Provincial Labour Standards',
    compliance:'Canada Labour Code · CRA · CPP · EI · PIPEDA',
    holiday_authority:'Federal / Provincial Government',
    max_foreign_workers:'LMIA-based work permits; CUSMA/USMCA',
    probation_max:'3 months (common; province-dependent)',
    notice_period:'2 weeks minimum (after 3 months service)',
    gratuity:'No statutory gratuity',
    ssf_applicable:false,
    dual_calendar_note:'',
  },
  'Custom / Other': {
    flag:'🌍', region:'Custom',
    currency:'', currency_code:'', currency_symbol:'',
    fy_pattern:'Custom', fy_start:'', fy_end:'', fy_example:'', fy_note:'Define your own financial year.',
    calendar:'Gregorian (AD)',
    leave_year:'Custom', leave_year_note:'Define your leave year period.',
    carry_forward:'', encashment:'',
    official_lang:'', interface_lang:'English',
    letter_lang:'', extra_langs:['English'],
    date_format:'DD/MM/YYYY', time_format:'24-hour',
    timezone:'UTC', timezone_offset:'+00:00',
    number_format:'1,000,000.00 (International)',
    weekend:['Saturday','Sunday'], payroll_cycle:'Monthly',
    ot_weekday:'As per local law', ot_weekend:'As per local law',
    ot_max_daily:'', ot_max_weekly:'',
    min_wage:'As per local law', tax_year:'', income_tax:'',
    social_security:'', labour_act:'', compliance:'',
    holiday_authority:'', max_foreign_workers:'',
    probation_max:'', notice_period:'', gratuity:'',
    ssf_applicable:false, dual_calendar_note:'',
  },
}

const COUNTRIES = Object.keys(COUNTRY_CONFIGS)

const ALL_CURRENCIES = [
  'NPR — Nepalese Rupee (रू)','INR — Indian Rupee (₹)','USD — US Dollar ($)',
  'GBP — Pound Sterling (£)','EUR — Euro (€)','AUD — Australian Dollar (A$)',
  'SGD — Singapore Dollar (S$)','AED — UAE Dirham (د.إ)','BDT — Bangladeshi Taka (৳)',
  'CNY — Chinese Yuan (¥)','JPY — Japanese Yen (¥)','CAD — Canadian Dollar (C$)',
  'CHF — Swiss Franc (Fr)','MYR — Malaysian Ringgit (RM)','KRW — Korean Won (₩)','Custom',
]

const FY_PATTERNS = [
  'Shrawan–Ashad / Mid-July–Mid-July (Nepal BS)',
  'April – March (India, UK)',
  'July – June (Australia, Bangladesh)',
  'January – December (Calendar Year)',
  'October – September (US Federal)',
  'April 6 – April 5 (UK Tax Year)',
  'Custom (define start/end below)',
]

const LEAVE_YEAR_PATTERNS = [
  'Same as Financial Year',
  'Calendar Year (Jan 1 – Dec 31)',
  'Tax Year aligned',
  'Employee Anniversary Year',
  'April – March',
  'July – June',
  'Custom',
]

const CALENDAR_SYSTEMS = [
  'Gregorian (AD) — International standard',
  'Bikram Sambat (BS) — Nepal (Primary) + Gregorian (Secondary)',
  'Hijri (Islamic Calendar) — UAE, Middle East',
  'Bengali Calendar + Gregorian',
  'Dual: BS + AD (Nepal dual-mode)',
]

const ALL_TIMEZONES = [
  'Asia/Kathmandu (NPT +5:45)','Asia/Kolkata (IST +5:30)','Asia/Dhaka (BST +6:00)',
  'Asia/Dubai (GST +4:00)','Asia/Singapore (SGT +8:00)','Asia/Shanghai (CST +8:00)',
  'Asia/Tokyo (JST +9:00)','Asia/Seoul (KST +9:00)','Asia/Bangkok (ICT +7:00)',
  'Europe/London (GMT/BST +0/+1)','Europe/Berlin (CET/CEST +1/+2)','Europe/Paris (CET/CEST +1/+2)',
  'America/New_York (EST/EDT −5/−4)','America/Chicago (CST/CDT −6/−5)',
  'America/Los_Angeles (PST/PDT −8/−7)','America/Toronto (EST/EDT −5/−4)',
  'Australia/Sydney (AEST/AEDT +10/+11)','Australia/Melbourne (AEST/AEDT +10/+11)',
  'Pacific/Auckland (NZST/NZDT +12/+13)','UTC',
]

const ALL_LANGUAGES = [
  'English','Nepali','Hindi','Arabic','Bengali','German','French','Spanish','Portuguese',
  'Mandarin Chinese','Malay','Tamil','Japanese','Korean','Sinhala','Urdu','Turkish',
]

const NEPAL_PROVINCES = [
  'Koshi Province','Madhesh Province','Bagmati Province',
  'Gandaki Province','Lumbini Province','Karnali Province','Sudurpashchim Province',
]

const NEPAL_DOCS = [
  {cat:'ocr',     name:'Company Registration Certificate',    auth:'Office of Company Registrar (OCR)',  icon:'🏛️', mandatory:true,  desc:'Registration under Companies Act 2063'},
  {cat:'pan',     name:'PAN Certificate',                      auth:'Inland Revenue Department (IRD)',    icon:'💳', mandatory:true,  desc:'Permanent Account Number'},
  {cat:'vat',     name:'VAT Registration Certificate',         auth:'Inland Revenue Department (IRD)',    icon:'🧾', mandatory:true,  desc:'VAT registration certificate'},
  {cat:'tax',     name:'Tax Clearance Certificate',            auth:'Inland Revenue Department (IRD)',    icon:'✅', mandatory:true,  desc:'Annual tax clearance'},
  {cat:'ssf',     name:'SSF Employer Registration',            auth:'Social Security Fund (SSF)',         icon:'🏥', mandatory:true,  desc:'Labour Act 2074 Section 102'},
  {cat:'labour',  name:'Annual Labour Audit Report',           auth:'Department of Labour (DoL)',         icon:'📋', mandatory:true,  desc:'Labour Act 2074 Section 142'},
  {cat:'ward',    name:'Ward/Municipality Registration',       auth:'Local Ward Office / Municipality',   icon:'🏢', mandatory:true,  desc:'Local level business registration'},
  {cat:'moa',     name:'Memorandum & Articles of Association', auth:'Office of Company Registrar',        icon:'📜', mandatory:true,  desc:'MOA and AOA of the company'},
  {cat:'trade',   name:'Trade License / Firm Renewal',         auth:'Department of Commerce',             icon:'🔖', mandatory:true,  desc:'Annual renewal certificate'},
  {cat:'audit',   name:'Audited Financial Statements',         auth:'Chartered Accountant (ICAN)',        icon:'📊', mandatory:true,  desc:'Annual audited accounts by CA'},
]

const GENERIC_DOCS = [
  {cat:'reg',     name:'Company Registration Certificate',     auth:'Registrar of Companies',             icon:'🏛️', mandatory:true,  desc:'Incorporation / registration certificate'},
  {cat:'tax_id',  name:'Tax Identification Number Certificate',auth:'Tax Authority',                      icon:'💳', mandatory:true,  desc:'TIN / EIN / CIN certificate'},
  {cat:'vat_gst', name:'VAT/GST Registration Certificate',     auth:'Tax Authority',                      icon:'🧾', mandatory:false, desc:'If VAT/GST registered'},
  {cat:'moa',     name:'Memorandum & Articles of Association', auth:'Registrar of Companies',             icon:'📜', mandatory:true,  desc:'MOA and AOA'},
  {cat:'audit',   name:'Audited Financial Statements',         auth:'Certified Accountant',               icon:'📊', mandatory:true,  desc:'Most recent audited accounts'},
  {cat:'ss_reg',  name:'Social Security Registration',         auth:'Social Security Authority',          icon:'🏥', mandatory:true,  desc:'Employer social security registration'},
]

// ── Shared UI components ──────────────────────────────────────
function Pill({ children, color='blue' }) {
  const m = { green:{bg:'#f0fdf4',text:'#15803d',border:'#bbf7d0'}, blue:{bg:'#eff6ff',text:'#1d4ed8',border:'#bfdbfe'}, yellow:{bg:'#fffbeb',text:'#b45309',border:'#fde68a'}, red:{bg:'#fef2f2',text:'#dc2626',border:'#fecaca'}, gray:{bg:'#f1f5f9',text:'#475569',border:'#e2e8f0'}, purple:{bg:'#f5f3ff',text:'#6d28d9',border:'#ddd6fe'}, orange:{bg:'#fff7ed',text:'#c2410c',border:'#fed7aa'} }
  const c = m[color]||m.blue
  return <span style={{background:c.bg,color:c.text,border:`1px solid ${c.border}`,padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,display:'inline-flex',alignItems:'center',whiteSpace:'nowrap'}}>{children}</span>
}

function Bar({ value, color='#3b82f6', h=6 }) {
  return <div style={{height:h,background:'#f1f5f9',borderRadius:h,overflow:'hidden'}}><div style={{width:`${Math.min(value,100)}%`,height:'100%',background:color,borderRadius:h,transition:'width .5s'}}/></div>
}

function FI({ label, value, onChange, placeholder, required, type='text', hint, readOnly, span }) {
  return (
    <div style={{marginBottom:14,gridColumn:span?'1/-1':undefined}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,color:'#334155',marginBottom:4}}>{label}{required&&<span style={{color:'#ef4444'}}> *</span>}</label>
      <input type={type} value={value||''} onChange={e=>onChange&&onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly}
        style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'inherit',background:readOnly?'#f8fafc':'#fff',color:readOnly?'#64748b':'#0f172a'}}/>
      {hint&&<div style={{fontSize:10,color:'#94a3b8',marginTop:3}}>{hint}</div>}
    </div>
  )
}

function FS({ label, value, onChange, options, required, span }) {
  return (
    <div style={{marginBottom:14,gridColumn:span?'1/-1':undefined}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,color:'#334155',marginBottom:4}}>{label}{required&&<span style={{color:'#ef4444'}}> *</span>}</label>
      <select value={value||''} onChange={e=>onChange(e.target.value)}
        style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:12,outline:'none',boxSizing:'border-box',background:'#fff',cursor:'pointer'}}>
        <option value="">— Select —</option>
        {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    </div>
  )
}

// ── Country Picker Modal (shown on first open) ────────────────
function CountryPickerModal({ onSelect }) {
  const [hovered, setHovered] = useState(null)
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#fff',borderRadius:24,padding:0,width:720,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 80px rgba(0,0,0,.4)'}}>
        <div style={{background:'linear-gradient(135deg,#1e1b4b,#4338ca,#818cf8)',padding:'28px 32px',borderRadius:'24px 24px 0 0',color:'#fff'}}>
          <div style={{fontSize:24,fontWeight:900,marginBottom:6}}>🌍 Select Your Country</div>
          <div style={{fontSize:13,opacity:.85,lineHeight:1.6}}>
            This auto-configures your HRMS with the correct:<br/>
            <strong>Financial Year · Leave Year · Currency · Calendar · Language · Timezone · Weekend Policy · OT Rates · Labour Compliance</strong>
          </div>
        </div>
        <div style={{padding:'24px 32px'}}>
          <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px',marginBottom:20,fontSize:11,color:'#92400e'}}>
            ⚡ All settings below auto-fill instantly when you choose a country. You can customize any field after selection.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
            {COUNTRIES.map(c=>{
              const cc = COUNTRY_CONFIGS[c]
              const isHov = hovered===c
              return (
                <button key={c} onClick={()=>onSelect(c)}
                  onMouseEnter={()=>setHovered(c)} onMouseLeave={()=>setHovered(null)}
                  style={{padding:'14px 12px',borderRadius:14,border:`2px solid ${isHov?'#4338ca':'#e2e8f0'}`,background:isHov?'#eff6ff':'#fafafa',cursor:'pointer',textAlign:'left',transition:'all .12s'}}>
                  <div style={{fontSize:28,marginBottom:6}}>{cc.flag}</div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c}</div>
                  <div style={{fontSize:9,color:'#64748b',marginTop:2}}>{cc.region}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{cc.currency_code} · {cc.fy_pattern?.split(' (')[0]}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Financial Config Tab ──────────────────────────────────────
function FinancialConfigTab({ data, onChange, country }) {
  const cc = COUNTRY_CONFIGS[country] || COUNTRY_CONFIGS['Custom / Other']
  const isCustomFY    = (data.fy_pattern||'').includes('Custom')
  const isCustomLeave = data.leave_year_pattern === 'Custom'
  const G = '#4338ca'

  // Info row helper
  const InfoRow = ({label, value, highlight}) => (
    <div style={{display:'flex',padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:11}}>
      <span style={{color:'#64748b',width:180,flexShrink:0,fontWeight:600}}>{label}</span>
      <span style={{fontWeight:700,color:highlight?'#1d4ed8':'#0f172a'}}>{value||'—'}</span>
    </div>
  )

  return (
    <div>
      {/* Country auto-config card */}
      <div style={{background:'linear-gradient(135deg,#f0fdf4,#eff6ff)',border:'1px solid #bbf7d0',borderRadius:16,padding:'18px 20px',marginBottom:22}}>
        <div style={{display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
          <div style={{fontSize:42,flexShrink:0}}>{cc.flag}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:'#0f172a',marginBottom:10}}>
              {country} — Configuration Applied
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:8}}>
              {[
                ['📅 Financial Year', cc.fy_example],
                ['🗓️ FY Pattern', cc.fy_pattern],
                ['🏖️ Leave Year', cc.leave_year],
                ['💰 Currency', cc.currency + ' (' + cc.currency_symbol + ')'],
                ['🗣️ Official Language', cc.official_lang],
                ['📅 Calendar', cc.calendar?.split(' (')[0]],
                ['⏰ Timezone', cc.timezone],
                ['💼 Payroll Cycle', cc.payroll_cycle],
                ['⚖️ Labour Act', cc.labour_act],
                ['🏖️ Weekend', cc.weekend?.join(' & ')],
              ].map(([k,v])=>(
                <div key={k} style={{background:'rgba(255,255,255,.75)',borderRadius:9,padding:'8px 12px'}}>
                  <div style={{fontSize:9,color:'#64748b',fontWeight:700,marginBottom:2}}>{k}</div>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{v||'—'}</div>
                </div>
              ))}
            </div>
            {cc.fy_note&&<div style={{marginTop:10,fontSize:10,color:'#4338ca',background:'rgba(67,56,202,.06)',borderRadius:8,padding:'6px 10px'}}>ℹ️ {cc.fy_note}</div>}
          </div>
        </div>
      </div>

      {/* ── Section: Financial Year ── */}
      <div style={{background:'#fafafa',borderRadius:14,border:'1px solid #e2e8f0',padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14,display:'flex',gap:8,alignItems:'center'}}>
          📅 Financial Year (FY) Configuration
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <FS label="FY Pattern" value={data.fy_pattern} onChange={v=>onChange('fy_pattern',v)} required options={FY_PATTERNS}/>
          <FS label="Calendar System" value={data.calendar_system} onChange={v=>onChange('calendar_system',v)} options={CALENDAR_SYSTEMS}/>
          {isCustomFY ? (
            <>
              <FI label="FY Start Month / Day" value={data.fy_start} onChange={v=>onChange('fy_start',v)} placeholder="e.g. 1 April" hint="Month and day the financial year starts"/>
              <FI label="FY End Month / Day" value={data.fy_end} onChange={v=>onChange('fy_end',v)} placeholder="e.g. 31 March"/>
              <FI label="Current FY Start Date" value={data.current_fy_start} onChange={v=>onChange('current_fy_start',v)} type="date"/>
              <FI label="Current FY End Date" value={data.current_fy_end} onChange={v=>onChange('current_fy_end',v)} type="date"/>
            </>
          ) : (
            <>
              <FI label="FY Start" value={cc.fy_start||data.fy_start} onChange={()=>{}} readOnly hint="Auto-set from country"/>
              <FI label="FY End" value={cc.fy_end||data.fy_end} onChange={()=>{}} readOnly hint="Auto-set from country"/>
              <FI label="Current FY Label" value={data.fy_label||cc.fy_example} onChange={v=>onChange('fy_label',v)} placeholder="e.g. FY 2081-82"/>
              <FI label="Current FY Start Date" value={data.current_fy_start} onChange={v=>onChange('current_fy_start',v)} type="date"/>
            </>
          )}
          <FS label="Tax Year" value={data.tax_year} onChange={v=>onChange('tax_year',v)}
            options={['Same as Financial Year','Calendar Year (Jan 1 – Dec 31)','April 6 – April 5 (UK)','July 1 – June 30','Custom']}/>
          <FS label="Payroll Cycle" value={data.payroll_cycle} onChange={v=>onChange('payroll_cycle',v)}
            options={['Monthly','Semi-monthly (twice/month)','Bi-weekly (every 2 weeks)','Weekly','Monthly (BS calendar)']}/>
        </div>
        {country==='Nepal'&&(
          <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:9,padding:'10px 14px',marginTop:4,fontSize:11,color:'#92400e'}}>
            🇳🇵 <strong>Nepal Dual Calendar:</strong> Salary periods run Bikram Sambat (BS) Shrawan–Ashad. The system operates in dual mode — BS for internal payroll display, Gregorian (AD) for international correspondence. <strong>FY 2081-82 BS = July 2024–July 2025 AD.</strong>
          </div>
        )}
      </div>

      {/* ── Section: Leave Year ── */}
      <div style={{background:'#fafafa',borderRadius:14,border:'1px solid #e2e8f0',padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>🏖️ Leave Year Period Configuration</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <FS label="Leave Year Pattern" value={data.leave_year_pattern} onChange={v=>onChange('leave_year_pattern',v)} required options={LEAVE_YEAR_PATTERNS}/>
          {isCustomLeave ? (
            <>
              <FI label="Leave Year Start" value={data.leave_year_start} onChange={v=>onChange('leave_year_start',v)} placeholder="e.g. 1 April"/>
              <FI label="Leave Year End" value={data.leave_year_end} onChange={v=>onChange('leave_year_end',v)} placeholder="e.g. 31 March"/>
            </>
          ) : (
            <FI label="Leave Year Description" value={cc.leave_year||data.leave_year_desc} onChange={v=>onChange('leave_year_desc',v)} readOnly={!!cc.leave_year} hint={cc.leave_year_note}/>
          )}
          <FS label="Leave Carry Forward Rule" value={data.leave_carry_forward} onChange={v=>onChange('leave_carry_forward',v)}
            options={['No carry forward — expires end of leave year','Full carry forward (no expiry)','Carry forward up to max cap','Cash encashment for unused leaves','As per company policy']}/>
          <FS label="Leave Encashment Policy" value={data.leave_encashment} onChange={v=>onChange('leave_encashment',v)}
            options={['Allowed on exit only','Allowed annually for excess','Not allowed','On termination only','As per contract']}/>
        </div>
        {cc.leave_year_note&&<div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:9,padding:'8px 12px',fontSize:10,color:'#0369a1',marginTop:4}}>ℹ️ {cc.leave_year_note}</div>}
      </div>

      {/* ── Section: Currency ── */}
      <div style={{background:'#fafafa',borderRadius:14,border:'1px solid #e2e8f0',padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>💰 Currency & Financial Settings</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <FS label="Primary Currency" value={data.currency} onChange={v=>onChange('currency',v)} required options={ALL_CURRENCIES}/>
          <FI label="Currency Symbol" value={data.currency_symbol||cc.currency_symbol} onChange={v=>onChange('currency_symbol',v)} placeholder="e.g. रू, $, £, ₹"/>
          <FS label="Secondary Currency (optional)" value={data.currency_secondary} onChange={v=>onChange('currency_secondary',v)} options={['None',...ALL_CURRENCIES]}/>
          <FI label="Exchange Rate (1 Primary = ? Secondary)" value={data.exchange_rate} onChange={v=>onChange('exchange_rate',v)} type="number" placeholder="e.g. 133.5"/>
          <FS label="Number Format" value={data.number_format} onChange={v=>onChange('number_format',v)}
            options={['1,00,000.00 (Indian/Nepal — Lakh system)','1,000,000.00 (International)','1.000.000,00 (European — Comma decimal)','1 000 000.00 (Space separator)']}/>
          <FI label="Income Tax System" value={cc.income_tax||data.income_tax} onChange={v=>onChange('income_tax',v)} readOnly={!!cc.income_tax} hint="Auto-filled from country"/>
        </div>
        {cc.social_security&&<div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:9,padding:'8px 12px',fontSize:10,color:'#4c1d95',marginTop:4}}>🏛️ <strong>Social Security:</strong> {cc.social_security}</div>}
      </div>

      {/* ── Section: Language & Region ── */}
      <div style={{background:'#fafafa',borderRadius:14,border:'1px solid #e2e8f0',padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>🗣️ Language & Regional Settings</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <FS label="Official / Country Language" value={data.official_language} onChange={v=>onChange('official_language',v)} required options={ALL_LANGUAGES}/>
          <FS label="HRMS Interface Language" value={data.interface_language} onChange={v=>onChange('interface_language',v)} options={ALL_LANGUAGES}/>
          <FS label="HR Letters & Documents Language" value={data.letter_language} onChange={v=>onChange('letter_language',v)} options={ALL_LANGUAGES}/>
          <FS label="Date Display Format" value={data.date_format} onChange={v=>onChange('date_format',v)}
            options={['DD/MM/YYYY (Nepal, UK, India, AU)','MM/DD/YYYY (USA)','YYYY-MM-DD (ISO 8601)','DD.MM.YYYY (Germany, Europe)','DD-MM-YYYY']}/>
          <FS label="Time Format" value={data.time_format} onChange={v=>onChange('time_format',v)} options={['12-hour (AM/PM)','24-hour']}/>
          <FS label="Timezone" value={data.timezone} onChange={v=>onChange('timezone',v)} options={ALL_TIMEZONES}/>
        </div>
        <div style={{marginBottom:4}}>
          <label style={{display:'block',fontSize:11,fontWeight:700,color:'#334155',marginBottom:8}}>Additional Languages Supported in HRMS</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {ALL_LANGUAGES.slice(0,10).map(lang=>(
              <label key={lang} style={{display:'flex',gap:5,alignItems:'center',padding:'4px 10px',borderRadius:20,border:`1px solid ${(data.extra_languages||[]).includes(lang)?'#4338ca':'#e2e8f0'}`,background:(data.extra_languages||[]).includes(lang)?'#eff6ff':'#fff',cursor:'pointer',fontSize:11,fontWeight:(data.extra_languages||[]).includes(lang)?600:400}}>
                <input type="checkbox" checked={(data.extra_languages||[]).includes(lang)} onChange={()=>{const curr=data.extra_languages||[];onChange('extra_languages',curr.includes(lang)?curr.filter(x=>x!==lang):[...curr,lang])}} style={{accentColor:'#4338ca',width:12,height:12}}/>
                {lang}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section: Working Week & OT ── */}
      <div style={{background:'#fafafa',borderRadius:14,border:'1px solid #e2e8f0',padding:'18px 20px',marginBottom:4}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:14}}>📅 Working Week, Holiday & OT Settings</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
          <div style={{gridColumn:'1/-1'}}>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:'#334155',marginBottom:8}}>Weekly Off Days</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=>(
                <label key={d} style={{display:'flex',gap:4,alignItems:'center',padding:'5px 12px',borderRadius:20,border:`1.5px solid ${(data.weekly_off||[]).includes(d)?'#ef4444':'#e2e8f0'}`,background:(data.weekly_off||[]).includes(d)?'#fef2f2':'#fff',cursor:'pointer',fontSize:11,fontWeight:(data.weekly_off||[]).includes(d)?700:400}}>
                  <input type="checkbox" checked={(data.weekly_off||[]).includes(d)} onChange={()=>{const curr=data.weekly_off||[];onChange('weekly_off',curr.includes(d)?curr.filter(x=>x!==d):[...curr,d])}} style={{accentColor:'#ef4444',width:12,height:12}}/>
                  {d.slice(0,3)}
                </label>
              ))}
            </div>
            {cc.weekend&&<div style={{fontSize:10,color:'#94a3b8',marginTop:5}}>💡 {country} standard: {cc.weekend.join(' & ')}</div>}
          </div>
          <FI label="Work Hours / Day" value={data.work_hours_per_day} onChange={v=>onChange('work_hours_per_day',v)} type="number" placeholder="8" hint="Ordinary hours per working day"/>
          <FI label="Work Days / Week" value={data.work_days_per_week} onChange={v=>onChange('work_days_per_week',v)} type="number" placeholder="5"/>
          <FS label="Public Holiday Calendar" value={data.holiday_calendar} onChange={v=>onChange('holiday_calendar',v)}
            options={['Nepal Government Holidays (Bikram Sambat)','India National + State Holidays','USA Federal Holidays','UK Bank Holidays','UAE Public Holidays','Germany Public Holidays','Custom Holiday Calendar']}/>
          <FI label="Holiday Authority" value={cc.holiday_authority||data.holiday_authority} onChange={v=>onChange('holiday_authority',v)} readOnly={!!cc.holiday_authority}/>
          <FS label="OT Rate — Weekday" value={data.ot_rate_weekday} onChange={v=>onChange('ot_rate_weekday',v)}
            options={['1.0× (straight time)','1.25× (standard)','1.5× (time and a half)','2.0× (double time)','As per Labour Act']}/>
          <FS label="OT Rate — Weekend / Holiday" value={data.ot_rate_weekend} onChange={v=>onChange('ot_rate_weekend',v)}
            options={['1.5×','2.0× (double time)','2.5×','As per Labour Act']}/>
          <FI label="Max OT / Day" value={data.ot_max_daily||cc.ot_max_daily} onChange={v=>onChange('ot_max_daily',v)} readOnly={!!cc.ot_max_daily} hint={cc.ot_max_daily?'From country config':'Set your policy'}/>
          <FI label="Max OT / Week" value={data.ot_max_weekly||cc.ot_max_weekly} onChange={v=>onChange('ot_max_weekly',v)} readOnly={!!cc.ot_max_weekly}/>
        </div>
        {country==='Nepal'&&(
          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:9,padding:'10px 14px',marginTop:10,fontSize:11,color:'#991b1b'}}>
            ⚖️ <strong>Nepal Labour Act 2074:</strong> OT on weekdays = 1.5× base rate. OT on weekends/holidays = 2× base rate. Max 4 hrs/day OT, max 24 hrs/week OT. Saturday is the mandatory weekly off. Standard 8 hrs/day, 48 hrs/week max.
          </div>
        )}
        {country==='UAE'&&(
          <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:9,padding:'10px 14px',marginTop:10,fontSize:11,color:'#92400e'}}>
            ⚖️ <strong>UAE Labour Law 2021:</strong> OT weekday = 1.25× basic + allowances. OT night/holiday = 1.5×. Max 2 hrs OT/day. WPS mandatory for salary payment.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Company Profile Tab ───────────────────────────────────────
function CompanyProfileTab({ data, onChange, country, onCountryChange }) {
  return (
    <div>
      {/* Country switcher strip */}
      <div style={{background:'linear-gradient(135deg,#1e1b4b,#4338ca)',borderRadius:14,padding:'16px 20px',marginBottom:18,color:'#fff'}}>
        <div style={{fontSize:12,fontWeight:700,marginBottom:10,opacity:.85}}>🌍 Active Country — click to change:</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {COUNTRIES.map(c=>(
            <button key={c} onClick={()=>onCountryChange(c)}
              style={{padding:'6px 12px',borderRadius:18,border:`2px solid ${country===c?'rgba(255,255,255,.9)':'rgba(255,255,255,.2)'}`,background:country===c?'rgba(255,255,255,.2)':'transparent',color:'#fff',fontSize:11,fontWeight:country===c?700:400,cursor:'pointer'}}>
              {COUNTRY_CONFIGS[c].flag} {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:11,color:'#92400e'}}>
        ⚖️ {COUNTRY_CONFIGS[country]?.compliance||'Select a country to see compliance requirements.'}
      </div>

      {/* Logo */}
      <div style={{textAlign:'center',marginBottom:18}}>
        <div style={{width:80,height:80,borderRadius:16,border:'2px dashed #cbd5e1',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',cursor:'pointer',fontSize:28}}>
          {data.logo_url?<img src={data.logo_url} alt="logo" style={{width:76,height:76,borderRadius:14,objectFit:'cover'}}/>:'🏢'}
        </div>
        <button style={{fontSize:11,color:'#4338ca',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>📤 Upload Company Logo</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <FI label="Company Legal Name" value={data.legal_name} onChange={v=>onChange('legal_name',v)} placeholder="As registered at government authority" required hint="Must match registration certificate exactly"/>
        <FI label="Company Short Name / Trade Name" value={data.short_name} onChange={v=>onChange('short_name',v)} placeholder="e.g. eLogix HRMS"/>

        {country==='Nepal'&&<>
          <FI label="PAN Number" value={data.pan_number} onChange={v=>onChange('pan_number',v)} placeholder="e.g. 609875432" required hint="Permanent Account Number — IRD"/>
          <FI label="VAT Registration Number" value={data.vat_number} onChange={v=>onChange('vat_number',v)} placeholder="e.g. 609875432000" hint="If VAT registered"/>
          <FI label="OCR Registration Number" value={data.ocr_number} onChange={v=>onChange('ocr_number',v)} placeholder="Company registration number" required/>
          <FI label="OCR Registration Date" value={data.ocr_date} onChange={v=>onChange('ocr_date',v)} type="date"/>
          <FI label="SSF Employer Code" value={data.ssf_code} onChange={v=>onChange('ssf_code',v)} placeholder="Social Security Fund code" hint="Required per Labour Act 2074 Section 102"/>
          <FS label="Labour Office Province" value={data.labour_zone} onChange={v=>onChange('labour_zone',v)} options={NEPAL_PROVINCES.map(p=>p+' Labour Office')}/>
        </>}

        {country!=='Nepal'&&country&&<>
          <FI label="Company Registration Number" value={data.reg_number} onChange={v=>onChange('reg_number',v)} placeholder="Registration/Incorporation number" required/>
          <FI label="Tax Identification Number (TIN/EIN/CIN)" value={data.tin_number} onChange={v=>onChange('tin_number',v)} placeholder="Tax ID number"/>
        </>}

        <FS label="Company Type" value={data.company_type} onChange={v=>onChange('company_type',v)} required
          options={country==='Nepal'?['Private Limited (Pvt. Ltd.)','Public Limited','NGO/INGO','Co-operative','Partnership Firm','Sole Proprietorship','Government Entity']:['Private Limited','Public Limited','LLC','Corporation','Partnership','Sole Proprietorship','NGO/Non-Profit','Government Entity']}/>
        <FS label="Industry" value={data.industry} onChange={v=>onChange('industry',v)}
          options={['Information Technology','Finance & Banking','Manufacturing','Retail & Trade','Healthcare','Education','Hospitality & Tourism','Construction','Agriculture','Non-Profit','Security Services','Logistics & Transport']}/>
        <FI label="Founded / Incorporated Date" value={data.founded_date} onChange={v=>onChange('founded_date',v)} type="date"/>
        <FI label="Total Employees (approx)" value={data.total_employees} onChange={v=>onChange('total_employees',v)} type="number" placeholder="e.g. 250"/>
        <FI label={country==='Nepal'?'Minimum Wage (NPR/month)':'Minimum Wage (local currency)'} value={data.min_wage} onChange={v=>onChange('min_wage',v)} type="number"
          placeholder={country==='Nepal'?'15000':'Local minimum wage'} hint={country==='Nepal'?'Nepal minimum: NPR 15,000/month (2024)':cc=>cc}/>
        <FI label={country==='Nepal'?'Foreign Worker % (max 5%)':'Foreign Worker %'} value={data.foreign_worker_pct} onChange={v=>onChange('foreign_worker_pct',v)} type="number" placeholder="0"
          hint={country==='Nepal'?'Nepal max: 5% per Labour Act 2074 Section 6':'Per local immigration policy'}/>
      </div>

      <FI label="Registered Address" value={data.registered_address} onChange={v=>onChange('registered_address',v)} placeholder="Full registered address as per government authority" required span/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        {country==='Nepal'?<>
          <FS label="Province" value={data.province} onChange={v=>onChange('province',v)} required options={NEPAL_PROVINCES}/>
          <FS label="District" value={data.district} onChange={v=>onChange('district',v)} options={['Kathmandu','Lalitpur','Bhaktapur','Kaski','Sunsari','Morang','Jhapa']}/>
          <FI label="Municipality / Ward" value={data.municipality} onChange={v=>onChange('municipality',v)} placeholder="e.g. Kathmandu Metropolitan City, Ward 14"/>
        </>:<>
          <FI label="State / Province / Emirate" value={data.province} onChange={v=>onChange('province',v)} placeholder="State/Province/Region"/>
          <FI label="City" value={data.city} onChange={v=>onChange('city',v)} placeholder="City"/>
          <FI label="Postal Code / ZIP" value={data.postal_code} onChange={v=>onChange('postal_code',v)} placeholder="Postal/ZIP code"/>
        </>}
        <FI label="Phone" value={data.phone} onChange={v=>onChange('phone',v)} placeholder="+977-1-XXXXXXX"/>
        <FI label="Email" value={data.email} onChange={v=>onChange('email',v)} type="email" placeholder="info@company.com"/>
        <FI label="Website" value={data.website} onChange={v=>onChange('website',v)} placeholder="https://www.company.com"/>
      </div>
    </div>
  )
}

// ── Legal Documents Tab ───────────────────────────────────────
function LegalDocsTab({ uploadedDocs, onUpload, country, companyName }) {
  const docs  = country==='Nepal' ? NEPAL_DOCS : GENERIC_DOCS
  const count = Object.keys(uploadedDocs).length
  const pct   = Math.round(count*100/docs.length)
  const fileRef = useRef()

  return (
    <div>
      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:800,color:'#dc2626',marginBottom:4}}>🚨 Mandatory Documents — {country}</div>
        <div style={{fontSize:12,color:'#991b1b',lineHeight:1.6}}>Upload {docs.length} required documents. Compliance: {COUNTRY_CONFIGS[country]?.compliance||'applicable local law'}.</div>
      </div>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'12px 16px',marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:8}}>
          <span style={{fontWeight:700}}>{companyName||'Company'}</span>
          <span style={{fontWeight:800,color:pct===100?'#10b981':'#ef4444'}}>{count}/{docs.length} · {pct}%</span>
        </div>
        <Bar value={pct} color={pct===100?'#10b981':'#3b82f6'} h={8}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {docs.map(doc=>{
          const up = uploadedDocs[doc.cat]
          return (
            <div key={doc.cat} style={{background:up?'#f0fdf4':'#fff',border:`1px solid ${up?'#bbf7d0':'#e2e8f0'}`,borderRadius:10,padding:'12px 14px'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <span style={{fontSize:22,flexShrink:0}}>{doc.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{doc.name}</span>
                    {doc.mandatory&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:6}}>REQUIRED</span>}
                    {up&&<Pill color="green">✓ Uploaded</Pill>}
                  </div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>Issued by: <strong>{doc.auth}</strong></div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{doc.desc}</div>
                  {up&&<div style={{fontSize:10,color:'#10b981',marginTop:4}}>📄 {up.name} · {up.size}KB</div>}
                </div>
                <div>
                  <input type="file" style={{display:'none'}} id={`file-${doc.cat}`} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>{const f=e.target.files[0];if(f)onUpload(doc.cat,{name:f.name,size:Math.round(f.size/1024),uploaded:new Date().toISOString()})}}/>
                  <label htmlFor={`file-${doc.cat}`} style={{padding:'6px 14px',borderRadius:8,border:'1px dashed #cbd5e1',background:up?'#f0fdf4':'#fff',color:'#4338ca',fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-block'}}>
                    {up?'↻ Replace':'📤 Upload'}
                  </label>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Summary / Review Tab ──────────────────────────────────────
function SummaryTab({ country, companyForm, financialForm, uploadedDocs }) {
  const cc   = COUNTRY_CONFIGS[country]||COUNTRY_CONFIGS['Custom / Other']
  const docs = country==='Nepal' ? NEPAL_DOCS : GENERIC_DOCS
  const pct  = Math.round(Object.keys(uploadedDocs).length*100/docs.length)

  const Row = ({k,v}) => (
    <div style={{display:'flex',padding:'7px 0',borderBottom:'1px solid #f1f5f9',fontSize:11}}>
      <span style={{color:'#64748b',width:200,flexShrink:0,fontWeight:600}}>{k}</span>
      <span style={{fontWeight:700,color:'#0f172a'}}>{v||'—'}</span>
    </div>
  )

  return (
    <div>
      <div style={{background:'linear-gradient(135deg,#f0fdf4,#eff6ff)',border:'1px solid #bbf7d0',borderRadius:16,padding:'20px',marginBottom:20}}>
        <div style={{fontSize:15,fontWeight:900,color:'#0f172a',marginBottom:14}}>{cc.flag} {country} — Complete Configuration Summary</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:'#374151',marginBottom:8}}>🏢 Company</div>
            <Row k="Legal Name" v={companyForm.legal_name}/>
            <Row k="Short Name" v={companyForm.short_name}/>
            <Row k="Type" v={companyForm.company_type}/>
            <Row k="Industry" v={companyForm.industry}/>
            {country==='Nepal'&&<><Row k="PAN" v={companyForm.pan_number}/><Row k="SSF Code" v={companyForm.ssf_code}/></>}
            {country!=='Nepal'&&<Row k="Registration" v={companyForm.reg_number}/>}
          </div>
          <div style={{paddingLeft:20,borderLeft:'1px solid #e2e8f0'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#374151',marginBottom:8}}>💰 Financial Config</div>
            <Row k="Financial Year" v={financialForm.fy_label||cc.fy_example}/>
            <Row k="FY Pattern" v={financialForm.fy_pattern}/>
            <Row k="Leave Year" v={financialForm.leave_year_pattern}/>
            <Row k="Currency" v={financialForm.currency}/>
            <Row k="Payroll Cycle" v={financialForm.payroll_cycle}/>
            <Row k="Calendar System" v={financialForm.calendar_system}/>
            <Row k="Timezone" v={financialForm.timezone}/>
            <Row k="Language" v={financialForm.official_language}/>
            <Row k="Weekend Off" v={(financialForm.weekly_off||[]).join(' & ')}/>
            <Row k="OT Weekday" v={financialForm.ot_rate_weekday}/>
            <Row k="OT Weekend" v={financialForm.ot_rate_weekend}/>
            <Row k="Date Format" v={financialForm.date_format}/>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {[{icon:'📋',label:'Profile',done:!!companyForm.legal_name},{icon:'💰',label:'Financial Config',done:!!financialForm.fy_pattern},{icon:'📍',label:'Address',done:!!companyForm.registered_address},{icon:'📜',label:'Documents',done:pct===100}].map((item,i)=>(
          <div key={i} style={{background:item.done?'#f0fdf4':'#fef2f2',borderRadius:12,padding:'14px',textAlign:'center',border:`1px solid ${item.done?'#bbf7d0':'#fecaca'}`}}>
            <div style={{fontSize:26}}>{item.icon}</div>
            <div style={{fontSize:11,fontWeight:700,marginTop:6,color:item.done?'#15803d':'#dc2626'}}>{item.label} {item.done?'✅':'⚠️'}</div>
          </div>
        ))}
      </div>

      <div style={{textAlign:'center'}}>
        <button disabled={pct<100||!companyForm.legal_name}
          style={{padding:'14px 36px',borderRadius:12,border:'none',background:pct===100&&companyForm.legal_name?'linear-gradient(135deg,#059669,#10b981)':'#e2e8f0',color:pct===100&&companyForm.legal_name?'#fff':'#94a3b8',fontSize:14,fontWeight:800,cursor:pct===100&&companyForm.legal_name?'pointer':'not-allowed',boxShadow:pct===100&&companyForm.legal_name?'0 4px 16px rgba(16,185,129,.3)':'none'}}>
          {pct===100&&companyForm.legal_name?'🚀 Activate Company':'Complete all required fields first'}
        </button>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────

// ── Shared tenant data hook ─────────────────────────────────
function useTenantCompany() {
  const [company, setCompany] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const load = async () => {
      // 1. Try real API
      try {
        const token = localStorage.getItem('elogix_token') ||
          JSON.parse(localStorage.getItem('elogix_auth')||'{}').token
        if (token) {
          const res = await fetch('/api/v1/companies/me', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const d = await res.json()
            setCompany(d.data || d.company || d)
            setLoading(false)
            return
          }
        }
      } catch {}
      // 2. Fallback: localStorage auth
      try {
        const auth = JSON.parse(localStorage.getItem('elogix_auth')||'{}')
        const regCos = JSON.parse(localStorage.getItem('elogix_registered_companies')||'{}')
        const co = auth.company || {}
        const slug = co.slug || auth.user?.company || 'demo'
        const regData = regCos[slug] || {}
        setCompany({
          id:            co.id || `c_${slug}`,
          name:          co.name || regData.name || 'Your Company',
          slug,
          plan:          co.plan || regData.plan || 'trial',
          status:        co.status || 'active',
          business_type: co.business_type || regData.business_type || 'custom',
          country:       co.country || regData.country || 'Nepal',
          currency:      co.currency || regData.currency || 'NPR',
          admin_email:   co.admin_email || regData.admin_email || auth.user?.email || '',
          modules:       co.modules || regData.modules || [],
          created_at:    co.created_at || regData.created_at || '',
          // Profile fields (empty until filled in setup)
          legal_name: '', short_name: '', pan_number: '', vat_number: '',
          ocr_number: '', ssf_code: '', industry: regData.business_type?.replace(/_/g,' ') || '',
          phone: regData.phone || '', email: regData.admin_email || co.admin_email || '',
          province:'', district:'', municipality:'', registered_address:'', website:'',
        })
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const saveTenantCompany = async (updates) => {
    // Merge updates into localStorage
    try {
      const auth = JSON.parse(localStorage.getItem('elogix_auth')||'{}')
      auth.company = { ...(auth.company||{}), ...updates }
      localStorage.setItem('elogix_auth', JSON.stringify(auth))
      setCompany(p => ({...p, ...updates}))
    } catch {}
    // Try API
    try {
      const token = localStorage.getItem('elogix_token') ||
        JSON.parse(localStorage.getItem('elogix_auth')||'{}').token
      if (token) {
        await fetch('/api/v1/companies/me', {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
          body: JSON.stringify(updates)
        })
      }
    } catch {}
  }

  return { company, loading, saveTenantCompany }
}


function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _useAppFallback() {
  const s = _getSession()
  return {
    sub: s?.last_page || '', persona: s?.persona || s?.user?.role || 'employee',
    lang: s?.lang || 'en', currency: s?.currency || 'NPR',
    company: s?.company || {}, user: s?.user || {},
    darkMode: false, setDarkMode: () => {},
    navTo: (p) => window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: p } })),
    switchPersona: () => {}, setShowNotif: () => {}, setShowAI: () => {},
    setSidebarOpen: () => {}, sidebarOpen: true,
    currentPersona: { id: s?.persona || 'employee', icon: '👤', color: '#7c3aed', label: '' },
  }
}

export default function CompanySetupPage() {
  const [showCountryPicker, setShowCountryPicker] = useState(true)
  const [country, setCountry]       = useState('')
  const [activeTab, setActiveTab]   = useState('profile')
  const [msg, setMsg]               = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),4000) }

  const { company: tenantCo, loading: tenantLoading, saveTenantCompany } = useTenantCompany()

  // Pre-fill form with tenant registration data
  useEffect(() => {
    if (tenantCo) {
      setCompanyForm(p => ({
        ...p,
        legal_name: tenantCo.legal_name || tenantCo.name || '',
        short_name: tenantCo.short_name || '',
        pan_number: tenantCo.pan_number || '',
        industry:   tenantCo.industry || tenantCo.business_type?.replace(/_/g,' ') || '',
        phone:      tenantCo.phone || '',
        email:      tenantCo.email || tenantCo.admin_email || '',
        province:   tenantCo.province || '',
        district:   tenantCo.district || '',
        registered_address: tenantCo.registered_address || '',
      }))
      if (tenantCo.country) setCountry(tenantCo.country)
    }
  }, [tenantCo?.id])

  const [companyForm, setCompanyForm] = useState({
    legal_name:'',short_name:'',pan_number:'',vat_number:'',ocr_number:'',ocr_date:'',
    company_type:'',industry:'',ssf_code:'',labour_zone:'',min_wage:'',foreign_worker_pct:'0',
    registered_address:'',province:'',district:'',municipality:'',phone:'',email:'',website:'',
    reg_number:'',tin_number:'',city:'',postal_code:'',founded_date:'',total_employees:'',
  })

  const [financialForm, setFinancialForm] = useState({
    fy_pattern:'',calendar_system:'',fy_start:'',fy_end:'',fy_label:'',
    current_fy_start:'',current_fy_end:'',
    tax_year:'Same as Financial Year', payroll_cycle:'Monthly',
    leave_year_pattern:'Same as Financial Year', leave_year_desc:'', leave_year_start:'', leave_year_end:'',
    leave_carry_forward:'No carry forward — expires end of leave year',
    leave_encashment:'Allowed on exit only',
    currency:'', currency_symbol:'', currency_secondary:'None', exchange_rate:'',
    number_format:'1,000,000.00 (International)',
    income_tax:'', social_security:'',
    official_language:'English', interface_language:'English', letter_language:'English',
    extra_languages:['English'],
    date_format:'DD/MM/YYYY (Nepal, UK, India, AU)', time_format:'12-hour (AM/PM)',
    timezone:'UTC', weekly_off:['Saturday','Sunday'],
    work_hours_per_day:'8', work_days_per_week:'5',
    holiday_calendar:'', holiday_authority:'',
    ot_rate_weekday:'1.5× (time and a half)', ot_rate_weekend:'2.0× (double time)',
    ot_max_daily:'', ot_max_weekly:'',
  })

  const [uploadedDocs, setUploadedDocs] = useState({})

  // ── Auto-fill everything when country selected ────────────
  const handleCountryChange = (c) => {
    const cc = COUNTRY_CONFIGS[c]
    if (!cc) return
    setCountry(c)
    setShowCountryPicker(false)

    setFinancialForm(prev=>({
      ...prev,
      // FY
      fy_pattern:   cc.fy_pattern,
      fy_start:     cc.fy_start,
      fy_end:       cc.fy_end,
      fy_label:     cc.fy_example,
      calendar_system: cc.calendar,
      tax_year:     cc.tax_year || 'Same as Financial Year',
      payroll_cycle:cc.payroll_cycle,
      // Leave
      leave_year_pattern: cc.leave_year.includes('Same as FY') || cc.leave_year.includes('Same as Financial') ? 'Same as Financial Year' : cc.leave_year.includes('Calendar') ? 'Calendar Year (Jan 1 – Dec 31)' : cc.leave_year.includes('Anniversary') ? 'Employee Anniversary Year' : cc.leave_year,
      leave_year_desc: cc.leave_year,
      leave_carry_forward: cc.carry_forward || prev.leave_carry_forward,
      leave_encashment:    cc.encashment    || prev.leave_encashment,
      // Currency
      currency:      cc.currency + ' (' + cc.currency_symbol + ')',
      currency_symbol: cc.currency_symbol,
      number_format: cc.number_format,
      income_tax:    cc.income_tax,
      social_security: cc.social_security,
      // Language
      official_language:  (cc.extra_langs||['English'])[0] || 'English',
      interface_language: 'English',
      letter_language:    cc.letter_lang || 'English',
      extra_languages:    cc.extra_langs || ['English'],
      // Date/Time
      date_format:  cc.date_format,
      time_format:  cc.time_format,
      timezone:     cc.timezone,
      // Week/OT
      weekly_off:   cc.weekend || ['Saturday','Sunday'],
      holiday_authority: cc.holiday_authority,
      ot_rate_weekday:
        cc.ot_weekday.includes('1.5')      ? '1.5× (time and a half)' :
        cc.ot_weekday.includes('2×')||cc.ot_weekday.includes('2.0') ? '2.0× (double time)' :
        cc.ot_weekday.includes('1.25')     ? '1.25× (standard)' : 'As per Labour Act',
      ot_rate_weekend:
        cc.ot_weekend.includes('2.5')      ? '2.5×' :
        cc.ot_weekend.includes('2×')||cc.ot_weekend.includes('2.0') ? '2.0× (double time)' :
        cc.ot_weekend.includes('1.5')      ? '1.5×' : 'As per Labour Act',
      ot_max_daily:  cc.ot_max_daily,
      ot_max_weekly: cc.ot_max_weekly,
    }))

    notify('✅ ' + c + ' selected — FY: ' + cc.fy_pattern + ' · Currency: ' + cc.currency_code + ' · ' + cc.calendar?.split(' (')[0] + ' Calendar · ' + cc.official_lang)
  }

  const cc = COUNTRY_CONFIGS[country] || {}

  const TABS = [
    {id:'profile',   icon:'🏢', label:'Company Profile'},
    {id:'financial', icon:'💰', label:'Financial & Regional', badge:'!'},
    {id:'documents', icon:'📜', label:'Legal Documents', badge:Object.keys(uploadedDocs).length > 0 ? '✓' : '!'},
    {id:'summary',   icon:'✅', label:'Review & Activate'},
  ]

  return (
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      {/* Country picker on first load */}
      {showCountryPicker && <CountryPickerModal onSelect={handleCountryChange}/>}

      {/* Header */}
      <div style={{marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <h2 style={{fontSize:22,fontWeight:900,color:'#0f172a',margin:0}}>Company Setup</h2>
          {country&&<Pill color="blue">{cc.flag} {country}</Pill>}
          {country&&<Pill color="purple">🗓️ {(financialForm.fy_pattern||'').split(' (')[0] || cc.fy_pattern}</Pill>}
          {country&&<Pill color="green">💰 {cc.currency_code}</Pill>}
          {country&&<Pill color="gray">⏰ {(financialForm.timezone||cc.timezone||'UTC').split(' ')[0]?.split('/')[1]||''}</Pill>}
        </div>
        {country&&<p style={{fontSize:11,color:'#94a3b8',margin:'6px 0 0'}}>{cc.compliance}</p>}
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:12,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:480,lineHeight:1.5}}>{msg}</div>}

      {/* Section Tabs */}
      <div style={{display:'flex',gap:2,background:'#f1f5f9',padding:4,borderRadius:12,marginBottom:18,border:'1px solid #e2e8f0'}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            style={{flex:1,padding:'9px 12px',borderRadius:9,border:'none',background:activeTab===tab.id?'#fff':'transparent',color:activeTab===tab.id?'#0f172a':'#64748b',fontWeight:activeTab===tab.id?700:400,fontSize:12,cursor:'pointer',boxShadow:activeTab===tab.id?'0 1px 4px rgba(0,0,0,.08)':'none',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
            {tab.icon} {tab.label}
            {tab.badge&&<span style={{background:tab.badge==='✓'?'#f0fdf4':'#fef2f2',color:tab.badge==='✓'?'#15803d':'#dc2626',fontSize:9,fontWeight:800,padding:'1px 5px',borderRadius:7}}>{tab.badge}</span>}
          </button>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'22px'}}>
        {activeTab==='profile'&&(
          <div>
            <CompanyProfileTab data={companyForm} onChange={(f,v)=>setCompanyForm(p=>({...p,[f]:v}))} country={country} onCountryChange={handleCountryChange}/>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
              <button onClick={()=>{notify('✅ Company profile saved');setActiveTab('financial')}}
                style={{padding:'10px 24px',borderRadius:9,border:'none',background:'#4338ca',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save & Continue → Financial Config</button>
            </div>
          </div>
        )}

        {activeTab==='financial'&&(
          <div>
            {!country?(
              <div style={{textAlign:'center',padding:'40px 20px',color:'#94a3b8'}}>
                <div style={{fontSize:42,marginBottom:12}}>🌍</div>
                <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Select a Country First</div>
                <button onClick={()=>setShowCountryPicker(true)} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'#4338ca',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Open Country Selector</button>
              </div>
            ):(
              <>
                <FinancialConfigTab data={financialForm} onChange={(f,v)=>setFinancialForm(p=>({...p,[f]:v}))} country={country}/>
                <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
                  <button onClick={()=>{notify('✅ Financial configuration saved for '+country);setActiveTab('documents')}}
                    style={{padding:'10px 24px',borderRadius:9,border:'none',background:'#4338ca',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save & Continue → Legal Documents</button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab==='documents'&&(
          <LegalDocsTab uploadedDocs={uploadedDocs} onUpload={(cat,data)=>setUploadedDocs(p=>({...p,[cat]:data}))} country={country||'Custom / Other'} companyName={companyForm.legal_name||companyForm.short_name||'Company'}/>
        )}

        {activeTab==='summary'&&(
          <SummaryTab country={country||'Custom / Other'} companyForm={companyForm} financialForm={financialForm} uploadedDocs={uploadedDocs}/>
        )}
      </div>
    </div>
  )
}

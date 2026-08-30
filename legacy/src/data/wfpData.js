/**
 * FILE: src/data/wfpData.js
 * Shared mock data + helpers for Workforce Planning module (13 pages)
 * Nepal Labour Act 2074 compliance built in.
 */

export const FISCAL_YEAR = '2081/82 BS (2024/25 AD)'
export const COMPANY     = 'eLogix HRMS Demo Company'

// ── Gradients per planning module ───────────────────────────
export const WFP_THEME = {
  quota:        { G:'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)', A:'#4338ca' },
  current:      { G:'linear-gradient(135deg,#064e3b 0%,#047857 60%,#34d399 100%)', A:'#047857' },
  location:     { G:'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)', A:'#0369a1' },
  annual:       { G:'linear-gradient(135deg,#3b0764 0%,#7e22ce 60%,#c084fc 100%)', A:'#7e22ce' },
  quarterly:    { G:'linear-gradient(135deg,#0f172a 0%,#1e40af 60%,#60a5fa 100%)', A:'#1e40af' },
  monthly:      { G:'linear-gradient(135deg,#064e3b 0%,#0891b2 60%,#67e8f9 100%)', A:'#0891b2' },
  headcount:    { G:'linear-gradient(135deg,#1c1917 0%,#92400e 60%,#fbbf24 100%)', A:'#92400e' },
  vacancy:      { G:'linear-gradient(135deg,#450a0a 0%,#b91c1c 60%,#fca5a5 100%)', A:'#b91c1c' },
  replacement:  { G:'linear-gradient(135deg,#0c4a6e 0%,#0e7490 60%,#67e8f9 100%)', A:'#0e7490' },
  expansion:    { G:'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)', A:'#15803d' },
  contract:     { G:'linear-gradient(135deg,#431407 0%,#c2410c 60%,#fb923c 100%)', A:'#c2410c' },
  productivity: { G:'linear-gradient(135deg,#1e1b4b 0%,#5b21b6 60%,#a78bfa 100%)', A:'#5b21b6' },
  resource:     { G:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#3b82f6 100%)', A:'#1e3a5f' },
}

// ── Departments ──────────────────────────────────────────────
export const DEPARTMENTS = [
  { id:'d1',  name:'Information Technology',    nepali:'सूचना प्रविधि',         branch:'KTM HQ',    quota:24, filled:21, vacant:3, onhold:0, grade_range:'G4-G8', budget_npr:4800000 },
  { id:'d2',  name:'Finance & Accounts',         nepali:'वित्त तथा लेखा',         branch:'KTM HQ',    quota:16, filled:14, vacant:2, onhold:1, grade_range:'G3-G7', budget_npr:3200000 },
  { id:'d3',  name:'Human Resources',            nepali:'मानव संसाधन',            branch:'KTM HQ',    quota:12, filled:11, vacant:1, onhold:0, grade_range:'G3-G7', budget_npr:2400000 },
  { id:'d4',  name:'Operations',                 nepali:'सञ्चालन',                branch:'KTM HQ',    quota:35, filled:30, vacant:5, onhold:2, grade_range:'G2-G6', budget_npr:7000000 },
  { id:'d5',  name:'Sales & Marketing',          nepali:'बिक्री र विपणन',          branch:'KTM HQ',    quota:20, filled:17, vacant:3, onhold:0, grade_range:'G3-G7', budget_npr:4000000 },
  { id:'d6',  name:'Customer Service',           nepali:'ग्राहक सेवा',             branch:'Pokhara',   quota:18, filled:15, vacant:3, onhold:1, grade_range:'G2-G5', budget_npr:3600000 },
  { id:'d7',  name:'Legal & Compliance',         nepali:'कानुन तथा अनुपालन',       branch:'KTM HQ',    quota:6,  filled:5,  vacant:1, onhold:0, grade_range:'G5-G9', budget_npr:1800000 },
  { id:'d8',  name:'Facilities & Admin',         nepali:'सुविधा तथा प्रशासन',     branch:'Biratnagar', quota:10, filled:9,  vacant:1, onhold:0, grade_range:'G1-G4', budget_npr:2000000 },
]

export const TOTAL_QUOTA  = DEPARTMENTS.reduce((s,d)=>s+d.quota,0)
export const TOTAL_FILLED = DEPARTMENTS.reduce((s,d)=>s+d.filled,0)
export const TOTAL_VACANT = DEPARTMENTS.reduce((s,d)=>s+d.vacant,0)
export const VACANCY_RATE = +(TOTAL_VACANT/TOTAL_QUOTA*100).toFixed(1)

// ── Branches / Locations ─────────────────────────────────────
export const BRANCHES = [
  { id:'b1', name:'KTM HQ (Kathmandu)',      code:'KTM',  province:'Bagmati',       quota:113, filled:98, vacant:15, budget_npr:22600000 },
  { id:'b2', name:'Pokhara Office',          code:'PKR',  province:'Gandaki',       quota:28,  filled:24, vacant:4,  budget_npr:5600000  },
  { id:'b3', name:'Biratnagar Office',       code:'BRT',  province:'Koshi',         quota:15,  filled:13, vacant:2,  budget_npr:3000000  },
  { id:'b4', name:'Birgunj Liaison',         code:'BGJ',  province:'Madhesh',       quota:8,   filled:6,  vacant:2,  budget_npr:1600000  },
]

// ── Positions registry (Darbadi) ─────────────────────────────
export const POSITIONS = [
  {id:'p1',  code:'POS-001', title:'Chief Technology Officer',     dept:'IT',        grade:'G8', type:'regular',   status:'filled',   filled_by:'Rajan Shrestha',    salary_npr:250000},
  {id:'p2',  code:'POS-002', title:'Senior Developer',             dept:'IT',        grade:'G6', type:'regular',   status:'filled',   filled_by:'Anita Gurung',      salary_npr:120000},
  {id:'p3',  code:'POS-003', title:'Full Stack Developer',         dept:'IT',        grade:'G5', type:'regular',   status:'vacant',   filled_by:null,                salary_npr:95000},
  {id:'p4',  code:'POS-004', title:'Finance Manager',              dept:'Finance',   grade:'G7', type:'regular',   status:'filled',   filled_by:'Sanjay Karki',      salary_npr:150000},
  {id:'p5',  code:'POS-005', title:'Accountant',                   dept:'Finance',   grade:'G4', type:'regular',   status:'filled',   filled_by:'Priya Khadka',      salary_npr:65000},
  {id:'p6',  code:'POS-006', title:'HR Business Partner',          dept:'HR',        grade:'G6', type:'regular',   status:'vacant',   filled_by:null,                salary_npr:110000},
  {id:'p7',  code:'POS-007', title:'Recruitment Specialist',       dept:'HR',        grade:'G4', type:'regular',   status:'filled',   filled_by:'Binita Rai',        salary_npr:70000},
  {id:'p8',  code:'POS-008', title:'Regional Sales Manager',       dept:'Sales',     grade:'G6', type:'regular',   status:'filled',   filled_by:'Dipak Tamang',      salary_npr:130000},
  {id:'p9',  code:'POS-009', title:'Sales Executive',              dept:'Sales',     grade:'G3', type:'time_bound', status:'filled',  filled_by:'Suresh KC',         salary_npr:55000},
  {id:'p10', code:'POS-010', title:'Operations Supervisor',        dept:'Operations',grade:'G5', type:'regular',   status:'onhold',   filled_by:null,                salary_npr:85000},
  {id:'p11', code:'POS-011', title:'Customer Service Rep',         dept:'Customer',  grade:'G2', type:'regular',   status:'filled',   filled_by:'Maya Thapa',        salary_npr:42000},
  {id:'p12', code:'POS-012', title:'Legal Officer',                dept:'Legal',     grade:'G6', type:'regular',   status:'filled',   filled_by:'Anil Pandey',       salary_npr:115000},
  {id:'p13', code:'POS-013', title:'Data Analyst',                 dept:'IT',        grade:'G5', type:'regular',   status:'vacant',   filled_by:null,                salary_npr:88000},
  {id:'p14', code:'POS-014', title:'Facilities Manager',           dept:'Facilities',grade:'G4', type:'regular',   status:'filled',   filled_by:'Ram Bahadur KC',    salary_npr:68000},
  {id:'p15', code:'POS-015', title:'Cloud Architect',              dept:'IT',        grade:'G7', type:'expansion', status:'planned',  filled_by:null,                salary_npr:180000},
]

// ── Monthly trend data ────────────────────────────────────────
export const MONTHS_BS = ['Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra','Baisakh','Jestha','Ashadh']
export const HEADCOUNT_TREND = [138,139,137,140,141,138,139,142,143,141,143,144]
export const ATTRITION_TREND = [2,1,3,0,1,2,1,0,1,2,1,2]
export const HIRING_TREND    = [3,2,1,3,2,0,2,3,2,0,3,3]

// ── Nepal LA2074 compliance helpers ──────────────────────────
export const NEPAL_LA = {
  probation_months: 6,
  max_hrs_day: 8,
  max_hrs_week: 48,
  ot_multiplier: 1.5,
  min_wage_npr: 15000,
  retrenchment_notice_days: 30,
  severance_per_yr_npr_months: 1,
  reserve_pool_pct: 50,
}

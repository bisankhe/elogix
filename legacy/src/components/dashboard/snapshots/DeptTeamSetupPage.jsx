// ============================================================
// FILE: src/components/dashboard/snapshots/DeptTeamSetupPage.jsx
// PURPOSE: Complete Org Management UI — Business Unit, Dept,
//          Section, Team, Cost Center, Work Location
//          AI-driven insights, visual org tree, CRUD forms
// ============================================================

import { useState, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

// ── Color / Icon Maps ─────────────────────────────────────────
const BU_TYPE_CONFIG = {
  division:      { icon:'🏛️', color:'#3b82f6', label:'Division'       },
  region:        { icon:'🌏', color:'#8b5cf6', label:'Region'          },
  product_line:  { icon:'📦', color:'#10b981', label:'Product Line'    },
  legal_entity:  { icon:'⚖️', color:'#f59e0b', label:'Legal Entity'   },
  subsidiary:    { icon:'🏢', color:'#06b6d4', label:'Subsidiary'      },
  holding:       { icon:'🎯', color:'#ef4444', label:'Holding'         },
}

const DEPT_TYPE_CONFIG = {
  functional:    { icon:'⚙️', color:'#3b82f6', label:'Functional'      },
  product:       { icon:'📦', color:'#10b981', label:'Product'          },
  geographical:  { icon:'🌏', color:'#8b5cf6', label:'Geographical'    },
  matrix:        { icon:'📐', color:'#f59e0b', label:'Matrix'          },
  project:       { icon:'🎯', color:'#ef4444', label:'Project'          },
  shared_services:{ icon:'🔄', color:'#06b6d4', label:'Shared Services'},
  hrbp:          { icon:'🤝', color:'#a855f7', label:'HR Business Partner'},
  coe:           { icon:'⭐', color:'#f97316', label:'Center of Excellence'},
  hrss:          { icon:'🎧', color:'#84cc16', label:'HR Shared Services'},
}

const TEAM_TYPE_CONFIG = {
  functional:       { icon:'⚙️', color:'#3b82f6' },
  project:          { icon:'🎯', color:'#10b981' },
  matrix:           { icon:'📐', color:'#f59e0b' },
  cross_functional: { icon:'🔀', color:'#8b5cf6' },
  agile_squad:      { icon:'🚀', color:'#ef4444' },
  tribe:            { icon:'🏹', color:'#06b6d4' },
  virtual:          { icon:'💻', color:'#a855f7' },
}

const LOC_TYPE_CONFIG = {
  hq:          { icon:'🏛️', color:'#3b82f6' },
  office:      { icon:'🏢', color:'#10b981' },
  branch:      { icon:'🏪', color:'#8b5cf6' },
  remote:      { icon:'🏠', color:'#f59e0b' },
  hybrid:      { icon:'🔄', color:'#06b6d4' },
  coworking:   { icon:'☕', color:'#f97316' },
  client_site: { icon:'🤝', color:'#a855f7' },
  virtual:     { icon:'💻', color:'#64748b' },
}

// ── Mock data (replace with API calls in production) ──────────
const MOCK_DATA = {
  businessUnits: [
    { id:'bu-001', code:'BU-NPL-001', name:'Nepal Operations',     bu_type:'division',    employee_count:1250, annual_budget:120000000, currency_code:'NPR', country_code:'NP', hierarchy_level:1, requires_cba:true, requires_lrc:true, requires_safety_com:true, is_active:true,
      ai_summary:'Strong operational division with 1,250 employees. Nepal Labour Act compliance required for all 3 committees.',
      compliance_alerts:[] },
    { id:'bu-002', code:'BU-IND-001', name:'India Operations',     bu_type:'region',      employee_count:420,  annual_budget:45000000,  currency_code:'INR', country_code:'IN', hierarchy_level:1, requires_cba:true, requires_lrc:true, requires_safety_com:true, is_active:true,
      ai_summary:'Growing India region. DPDP Act 2023 and state-specific Shops Act compliance required.',
      compliance_alerts:[] },
    { id:'bu-003', code:'BU-UK-001',  name:'UK & Europe Division', bu_type:'region',      employee_count:85,   annual_budget:18000000,  currency_code:'GBP', country_code:'GB', hierarchy_level:1, requires_cba:false, requires_lrc:false, requires_safety_com:true, is_active:true,
      ai_summary:'UK/EU division with GDPR and UK GDPR compliance fully implemented.',
      compliance_alerts:['Safety & Health Committee required (20+ employees)'] },
  ],
  departments: [
    { id:'dept-001', code:'DEPT-IT-001',  name:'Information Technology', bu_name:'Nepal Operations', dept_type:'functional',  ulrich_pillar:'general', dept_head_name:'Bikram Shrestha', current_headcount:320, headcount_budget:350, annual_budget:28000000, is_active:true },
    { id:'dept-002', code:'DEPT-HR-001',  name:'Human Resources',        bu_name:'Nepal Operations', dept_type:'hrbp',        ulrich_pillar:'hrbp',    dept_head_name:'Sita Sharma',     current_headcount:45,  headcount_budget:50,  annual_budget:5500000,  is_active:true },
    { id:'dept-003', code:'DEPT-FIN-001', name:'Finance & Accounts',     bu_name:'Nepal Operations', dept_type:'functional',  ulrich_pillar:'general', dept_head_name:'Hari KC',         current_headcount:80,  headcount_budget:85,  annual_budget:8000000,  is_active:true },
    { id:'dept-004', code:'DEPT-OPS-001', name:'Operations',             bu_name:'Nepal Operations', dept_type:'functional',  ulrich_pillar:'general', dept_head_name:'Maya Gurung',     current_headcount:280, headcount_budget:300, annual_budget:22000000, is_active:true },
    { id:'dept-005', code:'DEPT-MKT-001', name:'Marketing & Sales',      bu_name:'Nepal Operations', dept_type:'product',     ulrich_pillar:'general', dept_head_name:'Raj Thapa',       current_headcount:120, headcount_budget:130, annual_budget:15000000, is_active:true },
    { id:'dept-006', code:'DEPT-LD-001',  name:'Learning & Development', bu_name:'Nepal Operations', dept_type:'coe',         ulrich_pillar:'coe',     dept_head_name:'Priya Rai',       current_headcount:18,  headcount_budget:20,  annual_budget:3200000,  is_active:true },
  ],
  sections: [
    { id:'sec-001', code:'SEC-IT-DEV', name:'Software Development',  entity_type:'section', dept_name:'Information Technology', section_head_name:'Ram Bista',    specialization:'Full-Stack Development', swim_lane_color:'#3b82f6', current_headcount:180, is_active:true },
    { id:'sec-002', code:'SEC-IT-INF', name:'Infrastructure & Cloud', entity_type:'section', dept_name:'Information Technology', section_head_name:'Anita Tamang', specialization:'AWS & DevOps',          swim_lane_color:'#10b981', current_headcount:65,  is_active:true },
    { id:'sec-003', code:'SEC-IT-QA',  name:'Quality Assurance',      entity_type:'unit',    dept_name:'Information Technology', section_head_name:'Dev Poudel',   specialization:'Automation Testing',    swim_lane_color:'#f59e0b', current_headcount:45,  is_active:true },
    { id:'sec-004', code:'SEC-HR-REC', name:'Talent Acquisition',     entity_type:'unit',    dept_name:'Human Resources',       section_head_name:'Gita Lama',    specialization:'Recruitment & Onboarding', swim_lane_color:'#8b5cf6', current_headcount:12, is_active:true },
    { id:'sec-005', code:'SEC-FIN-PAY', name:'Payroll & Benefits',    entity_type:'unit',    dept_name:'Finance & Accounts',    section_head_name:'Suresh Karki', specialization:'Payroll Processing',   swim_lane_color:'#ef4444', current_headcount:18,  is_active:true },
    { id:'sec-006', code:'SEC-MKT-DIG', name:'Digital Marketing',     entity_type:'section', dept_name:'Marketing & Sales',     section_head_name:'Prisha Magar', specialization:'SEO & Social Media',   swim_lane_color:'#f97316', current_headcount:28,  is_active:true },
  ],
  teams: [
    { id:'team-001', code:'TEAM-FE-01', name:'Frontend Squad Alpha', team_type:'agile_squad', dept_name:'IT', team_lead_name:'Roshan Shrestha', current_headcount:8,  max_headcount:10, agile_methodology:'scrum',  sprint_velocity:84, status:'active',  is_cross_functional:false, team_color:'#3b82f6', team_icon:'🚀' },
    { id:'team-002', code:'TEAM-BE-01', name:'Backend API Team',     team_type:'functional',   dept_name:'IT', team_lead_name:'Binita KC',       current_headcount:12, max_headcount:15, agile_methodology:'kanban', sprint_velocity:72, status:'active',  is_cross_functional:false, team_color:'#10b981', team_icon:'⚙️' },
    { id:'team-003', code:'TEAM-CF-01', name:'Product Launch Tiger', team_type:'tiger_team',   dept_name:'IT', team_lead_name:'Amir Shrestha',   current_headcount:6,  max_headcount:8,  agile_methodology:'scrumban',sprint_velocity:90, status:'active', is_cross_functional:true,  team_color:'#ef4444', team_icon:'🐯' },
    { id:'team-004', code:'TEAM-HR-01', name:'HRBP Cluster Nepal',   team_type:'matrix',       dept_name:'HR', team_lead_name:'Sita Sharma',     current_headcount:4,  max_headcount:6,  agile_methodology:null,    sprint_velocity:null,status:'active', is_cross_functional:true,  team_color:'#8b5cf6', team_icon:'🤝' },
    { id:'team-005', code:'TEAM-DS-01', name:'Data Science Squad',   team_type:'cross_functional', dept_name:'IT', team_lead_name:'Prabesh Karki', current_headcount:5, max_headcount:8, agile_methodology:'scrum', sprint_velocity:68, status:'active',  is_cross_functional:true,  team_color:'#f59e0b', team_icon:'📊' },
  ],
  costCenters: [
    { id:'cc-001', code:'CC-IT-OPS',   name:'IT Operations',        cc_type:'operational', dept_name:'Information Technology', gl_account_code:'4001', annual_budget:15000000, ytd_actual:8750000, ytd_committed:2000000, utilization_pct:58.3, budget_variance:6250000, currency_code:'NPR', approver_name:'CTO', is_active:true },
    { id:'cc-002', code:'CC-HR-ADM',   name:'HR Administration',    cc_type:'overhead',    dept_name:'Human Resources',       gl_account_code:'4002', annual_budget:3500000,  ytd_actual:2100000, ytd_committed:500000,  utilization_pct:60.0, budget_variance:1400000, currency_code:'NPR', approver_name:'HR Director', is_active:true },
    { id:'cc-003', code:'CC-MKT-ADV',  name:'Marketing Ad Spend',   cc_type:'investment',  dept_name:'Marketing & Sales',     gl_account_code:'4003', annual_budget:8000000,  ytd_actual:5600000, ytd_committed:1200000, utilization_pct:70.0, budget_variance:2400000, currency_code:'NPR', approver_name:'CMO', is_active:true },
    { id:'cc-004', code:'CC-FIN-PAY',  name:'Payroll Processing',   cc_type:'operational', dept_name:'Finance & Accounts',    gl_account_code:'4004', annual_budget:45000000, ytd_actual:26000000,ytd_committed:5000000, utilization_pct:57.8, budget_variance:19000000,currency_code:'NPR', approver_name:'CFO', is_active:true },
    { id:'cc-005', code:'CC-LD-TRN',   name:'Training & L&D',       cc_type:'investment',  dept_name:'Learning & Development',gl_account_code:'4005', annual_budget:2800000,  ytd_actual:1960000, ytd_committed:350000,  utilization_pct:70.0, budget_variance:840000,  currency_code:'NPR', approver_name:'L&D Head', is_active:true },
  ],
  workLocations: [
    { id:'wl-001', code:'LOC-KTM-HQ', name:'Kathmandu Headquarters', location_type:'hq',     city:'Kathmandu',  country_code:'NP', country_name:'Nepal',        timezone:'Asia/Kathmandu', utc_offset:'+05:45', current_headcount:850, max_capacity:1000, capacity_utilization:85.0, supports_remote:false, supports_hybrid:true,  is_primary:true,  is_active:true, local_minimum_wage:15000, minimum_wage_currency:'NPR', labour_office_zone:'Bagmati Province', facilities:{canteen:true, medical:true, parking:true} },
    { id:'wl-002', code:'LOC-PKR-BR', name:'Pokhara Branch Office',  location_type:'branch',  city:'Pokhara',    country_code:'NP', country_name:'Nepal',        timezone:'Asia/Kathmandu', utc_offset:'+05:45', current_headcount:145, max_capacity:200,  capacity_utilization:72.5, supports_remote:false, supports_hybrid:false, is_primary:false, is_active:true, local_minimum_wage:15000, minimum_wage_currency:'NPR', labour_office_zone:'Gandaki Province',  facilities:{canteen:false,medical:true, parking:true} },
    { id:'wl-003', code:'LOC-DEL-IN', name:'Delhi India Office',     location_type:'office',  city:'New Delhi',  country_code:'IN', country_name:'India',        timezone:'Asia/Kolkata',   utc_offset:'+05:30', current_headcount:420, max_capacity:500,  capacity_utilization:84.0, supports_remote:true,  supports_hybrid:true,  is_primary:false, is_active:true, local_minimum_wage:0, minimum_wage_currency:'INR', labour_office_zone:'Delhi NCR', facilities:{canteen:true, medical:true, parking:false} },
    { id:'wl-004', code:'LOC-LDN-UK', name:'London UK Office',       location_type:'office',  city:'London',     country_code:'GB', country_name:'United Kingdom',timezone:'Europe/London',  utc_offset:'+00:00', current_headcount:55,  max_capacity:80,   capacity_utilization:68.8, supports_remote:true,  supports_hybrid:true,  is_primary:false, is_active:true, local_minimum_wage:0, minimum_wage_currency:'GBP', labour_office_zone:'Greater London', facilities:{canteen:false,medical:false,parking:false} },
    { id:'wl-005', code:'LOC-RMT-GL', name:'Global Remote Workers',  location_type:'remote',  city:'Various',    country_code:'XX', country_name:'Global',       timezone:'Multiple',       utc_offset:'Various',current_headcount:180, max_capacity:500,  capacity_utilization:36.0, supports_remote:true,  supports_hybrid:false, is_primary:false, is_active:true, local_minimum_wage:null, minimum_wage_currency:null, labour_office_zone:null, facilities:{canteen:false,medical:false,parking:false} },
  ]
}

// ── Shared Components ─────────────────────────────────────────
function Pill({ children, color='blue' }) {
  const m = {
    green:  { bg:'#f0fdf4', text:'#15803d', border:'#bbf7d0' },
    blue:   { bg:'#eff6ff', text:'#1d4ed8', border:'#bfdbfe' },
    yellow: { bg:'#fffbeb', text:'#b45309', border:'#fde68a' },
    red:    { bg:'#fef2f2', text:'#dc2626', border:'#fecaca' },
    purple: { bg:'#f5f3ff', text:'#6d28d9', border:'#ddd6fe' },
    orange: { bg:'#fff7ed', text:'#c2410c', border:'#fed7aa' },
    cyan:   { bg:'#ecfeff', text:'#0e7490', border:'#a5f3fc' },
    gray:   { bg:'#f1f5f9', text:'#475569', border:'#e2e8f0' },
  }
  const c = m[color] || m.blue
  return (
    <span style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}`,
      padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700,
      display:'inline-flex', alignItems:'center', whiteSpace:'nowrap' }}>
      {children}
    </span>
  )
}

function ProgressBar({ value, color='#3b82f6', size='sm' }) {
  const h = size === 'sm' ? 6 : 10
  return (
    <div style={{ height:h, background:'#f1f5f9', borderRadius:h, overflow:'hidden' }}>
      <div style={{ width:`${Math.min(value,100)}%`, height:'100%', background:color,
        borderRadius:h, transition:'width .5s ease' }}/>
    </div>
  )
}

function StatMini({ icon, label, value, color='#3b82f6' }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10,
      padding:'10px 14px', borderLeft:`3px solid ${color}` }}>
      <div style={{ fontSize:18, marginBottom:3 }}>{icon}</div>
      <div style={{ fontSize:18, fontWeight:900, color:'#0f172a', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:'#94a3b8', marginTop:2, fontWeight:600 }}>{label}</div>
    </div>
  )
}

function AIInsightBox({ summary, score, observations = [] }) {
  if (!summary) return null
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ background:'linear-gradient(135deg,#f5f3ff,#eff6ff)',
      border:'1px solid #c4b5fd', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{ fontSize:14 }}>🧠</span>
        <span style={{ fontSize:12, fontWeight:800, color:'#1e1b4b' }}>AI Insight</span>
        {score && (
          <span style={{ marginLeft:'auto', background:`${scoreColor}20`, color:scoreColor,
            fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>
            Health: {score}/100
          </span>
        )}
      </div>
      <p style={{ fontSize:11, color:'#4c1d95', lineHeight:1.6, margin:'0 0 6px' }}>
        {summary}
      </p>
      {observations.slice(0,2).map((obs,i) => (
        <div key={i} style={{ display:'flex', gap:6, fontSize:11, color:'#6d28d9', marginTop:4 }}>
          <span>•</span><span>{obs}</span>
        </div>
      ))}
    </div>
  )
}

// ── Section: Business Units ───────────────────────────────────
function BusinessUnitsSection({ data }) {
  const [expanded, setExpanded] = useState(null)
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
        <StatMini icon="🏛️" label="Total BUs"     value={data.length}                             color="#3b82f6" />
        <StatMini icon="👥" label="Total Headcount" value={data.reduce((s,b)=>s+b.employee_count,0).toLocaleString()} color="#10b981" />
        <StatMini icon="💰" label="Total Budget (NPR)" value={`${(data.reduce((s,b)=>s+(b.annual_budget||0),0)/1000000).toFixed(0)}M`} color="#f59e0b" />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {data.map(bu => {
          const cfg = BU_TYPE_CONFIG[bu.bu_type] || BU_TYPE_CONFIG.division
          const isOpen = expanded === bu.id
          return (
            <div key={bu.id} style={{ background:'#fff', border:`1px solid ${isOpen ? cfg.color : '#e2e8f0'}`,
              borderRadius:12, overflow:'hidden', transition:'border-color .2s' }}>
              <div onClick={() => setExpanded(isOpen ? null : bu.id)}
                style={{ padding:'14px 16px', cursor:'pointer', display:'flex',
                  alignItems:'center', gap:12, borderLeft:`4px solid ${cfg.color}` }}>
                <span style={{ fontSize:22 }}>{cfg.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>{bu.name}</div>
                  <div style={{ fontSize:10, color:'#94a3b8' }}>{bu.code} · {cfg.label}</div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
                  <Pill color="blue">👥 {bu.employee_count.toLocaleString()}</Pill>
                  {bu.country_code === 'NP' && (
                    <Pill color={bu.requires_cba ? 'green' : 'gray'}>
                      {bu.requires_cba ? '✓ CBA' : 'No CBA'}
                    </Pill>
                  )}
                  <span style={{ fontSize:14, color:'#94a3b8' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding:'0 16px 16px', borderTop:'1px solid #f1f5f9' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, margin:'12px 0' }}>
                    <div style={{ textAlign:'center', padding:'8px', background:'#f8fafc', borderRadius:8 }}>
                      <div style={{ fontSize:16, fontWeight:800, color:'#0f172a' }}>{bu.employee_count}</div>
                      <div style={{ fontSize:10, color:'#94a3b8' }}>Employees</div>
                    </div>
                    <div style={{ textAlign:'center', padding:'8px', background:'#f8fafc', borderRadius:8 }}>
                      <div style={{ fontSize:14, fontWeight:800, color:'#0f172a' }}>
                        {(bu.annual_budget/1000000).toFixed(1)}M {bu.currency_code}
                      </div>
                      <div style={{ fontSize:10, color:'#94a3b8' }}>Annual Budget</div>
                    </div>
                    <div style={{ textAlign:'center', padding:'8px', background:'#f8fafc', borderRadius:8 }}>
                      <div style={{ fontSize:14, fontWeight:800, color:'#0f172a' }}>{bu.country_code}</div>
                      <div style={{ fontSize:10, color:'#94a3b8' }}>Country</div>
                    </div>
                  </div>

                  {/* Nepal Labour Act compliance */}
                  {bu.country_code === 'NP' && (
                    <div style={{ background:'#fffbeb', border:'1px solid #fde68a',
                      borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:6 }}>
                        ⚖️ Nepal Labour Act 2074 — Required Committees:
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <Pill color={bu.requires_cba ? 'green' : 'yellow'}>
                          {bu.requires_cba ? '✓' : '✗'} Collective Bargaining Committee
                        </Pill>
                        <Pill color={bu.requires_lrc ? 'green' : 'yellow'}>
                          {bu.requires_lrc ? '✓' : '✗'} Labour Relations Committee
                        </Pill>
                        <Pill color={bu.requires_safety_com ? 'green' : 'yellow'}>
                          {bu.requires_safety_com ? '✓' : '✗'} Safety & Health Committee
                        </Pill>
                      </div>
                    </div>
                  )}

                  <AIInsightBox
                    summary={bu.ai_summary}
                    score={85}
                    observations={bu.compliance_alerts}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section: Departments (Ulrich Model) ───────────────────────
function DepartmentsSection({ data }) {

  const ulrichGroups = {
    hrbp:    data.filter(d => d.ulrich_pillar === 'hrbp'),
    coe:     data.filter(d => d.ulrich_pillar === 'coe'),
    hrss:    data.filter(d => d.ulrich_pillar === 'hrss'),
    general: data.filter(d => !d.ulrich_pillar || d.ulrich_pillar === 'general'),
  }

  return (
    <div>
      {/* Ulrich Model banner */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
        {[
          { key:'hrbp', label:'HR Business Partners', icon:'🤝', color:'#8b5cf6', desc:'Strategic advisors embedded in business units' },
          { key:'coe',  label:'Centers of Excellence', icon:'⭐', color:'#f97316', desc:'Subject matter experts — Talent, Comp & Benefits, L&D' },
          { key:'hrss', label:'HR Shared Services', icon:'🎧', color:'#84cc16', desc:'Day-to-day admin — Payroll, ESS, ticketing' },
        ].map(p => (
          <div key={p.key} style={{ background:'#fff', border:`1px solid ${p.color}30`,
            borderRadius:10, padding:'12px 14px', borderLeft:`4px solid ${p.color}` }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{p.icon}</div>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{p.label}</div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:2, lineHeight:1.4 }}>{p.desc}</div>
            <div style={{ fontSize:16, fontWeight:800, color:p.color, marginTop:6 }}>
              {ulrichGroups[p.key]?.length || 0} dept{(ulrichGroups[p.key]?.length||0)!==1?'s':''}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {data.map(dept => {
          const hcPct = dept.headcount_budget
            ? Math.round(dept.current_headcount * 100 / dept.headcount_budget)
            : 0

          return (
            <div key={dept.id} style={{ background:'#fff',
              border:`1px solid ${isOpen ? cfg.color : '#e2e8f0'}`,
              borderRadius:10, overflow:'hidden', cursor:'pointer' }}
              onClick={() => setExpanded(isOpen ? null : dept.id)}>
              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center',
                gap:10, borderLeft:`4px solid ${cfg.color}` }}>
                <span style={{ fontSize:20 }}>{cfg.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{dept.name}</div>
                  <div style={{ fontSize:10, color:'#94a3b8' }}>
                    {dept.code} · {dept.bu_name} · {dept.dept_head_name}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                  <Pill color="blue">👥 {dept.current_headcount}/{dept.headcount_budget}</Pill>
                  {dept.ulrich_pillar && dept.ulrich_pillar !== 'general' && (
                    <Pill color="purple">{dept.ulrich_pillar?.toUpperCase()}</Pill>
                  )}
                  <span style={{ fontSize:12, color:'#94a3b8' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding:'0 14px 14px', borderTop:'1px solid #f1f5f9' }}>
                  <div style={{ marginTop:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between',
                      fontSize:11, marginBottom:4 }}>
                      <span style={{ color:'#64748b' }}>Headcount Utilization</span>
                      <span style={{ fontWeight:700, color: hcPct > 90 ? '#ef4444' : '#10b981' }}>
                        {hcPct}%
                      </span>
                    </div>
                    <ProgressBar value={hcPct} color={hcPct > 90 ? '#ef4444' : '#3b82f6'} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
                    <div style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px',fontSize:11 }}>
                      <div style={{ color:'#94a3b8' }}>Annual Budget</div>
                      <div style={{ fontWeight:700 }}>NPR {(dept.annual_budget/1000000).toFixed(2)}M</div>
                    </div>
                    <div style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px',fontSize:11 }}>
                      <div style={{ color:'#94a3b8' }}>Dept Type</div>
                      <div style={{ fontWeight:700 }}>{cfg.label}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section: Sections & Units (Swim Lanes) ────────────────────
function SectionsSection({ data }) {
  return (
    <div>
      <div style={{ marginBottom:12, fontSize:11, color:'#64748b', fontStyle:'italic' }}>
        💡 Swim lane view — each color represents a specialized operational domain
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {data.map(sec => (
          <div key={sec.id} style={{ background:'#fff',
            border:`1px solid ${sec.swim_lane_color}40`,
            borderRadius:10, padding:'12px 14px',
            borderLeft:`4px solid ${sec.swim_lane_color}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ width:10, height:10, borderRadius:'50%',
                background:sec.swim_lane_color, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#0f172a',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {sec.name}
                </div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>{sec.code}</div>
              </div>
              <Pill color={sec.entity_type === 'section' ? 'blue' : 'purple'}>
                {sec.entity_type}
              </Pill>
            </div>
            <div style={{ fontSize:10, color:'#64748b', marginBottom:6 }}>
              🏢 {sec.dept_name}
            </div>
            <div style={{ fontSize:10, color:'#475569', fontStyle:'italic', marginBottom:6 }}>
              {sec.specialization}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
              <span style={{ color:'#94a3b8' }}>Head: {sec.section_head_name}</span>
              <span style={{ fontWeight:700, color:sec.swim_lane_color }}>
                👥 {sec.current_headcount}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section: Teams ────────────────────────────────────────────
function TeamsSection({ data }) {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[
          { label:'Total Teams',      value:data.length,                                color:'#3b82f6', icon:'👥' },
          { label:'Active',           value:data.filter(t=>t.status==='active').length,  color:'#10b981', icon:'✅' },
          { label:'Cross-Functional', value:data.filter(t=>t.is_cross_functional).length,color:'#8b5cf6', icon:'🔀' },
          { label:'Agile Teams',      value:data.filter(t=>t.agile_methodology).length,  color:'#f59e0b', icon:'🚀' },
        ].map((s,i) => (
          <StatMini key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {data.map(team => {
          const capPct = team.max_headcount
            ? Math.round(team.current_headcount * 100 / team.max_headcount)
            : 0

          return (
            <div key={team.id} style={{ background:'#fff',
              border:`1px solid ${team.team_color}40`,
              borderRadius:10, padding:'12px 14px',
              borderLeft:`4px solid ${team.team_color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:20 }}>{team.team_icon || cfg.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#0f172a',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {team.name}
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8' }}>{team.code}</div>
                </div>
                <Pill color={team.status==='active'?'green':'gray'}>{team.status}</Pill>
              </div>

              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                <Pill color="blue">{team.team_type.replace('_',' ')}</Pill>
                {team.is_cross_functional && <Pill color="purple">Cross-Functional</Pill>}
                {team.agile_methodology && <Pill color="orange">{team.agile_methodology}</Pill>}
              </div>

              <div style={{ fontSize:10, color:'#64748b', marginBottom:6 }}>
                👤 Lead: {team.team_lead_name}
              </div>

              <div style={{ marginBottom:4 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  fontSize:10, marginBottom:2 }}>
                  <span style={{ color:'#94a3b8' }}>Team Capacity</span>
                  <span style={{ fontWeight:700 }}>
                    {team.current_headcount}/{team.max_headcount || '∞'}
                  </span>
                </div>
                {team.max_headcount && <ProgressBar value={capPct} color={team.team_color} />}
              </div>

              {team.sprint_velocity && (
                <div style={{ marginTop:6, fontSize:10, color:'#64748b' }}>
                  🚀 Sprint velocity: <strong>{team.sprint_velocity} pts</strong>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section: Cost Centers ─────────────────────────────────────
function CostCentersSection({ data }) {
  const totalBudget = data.reduce((s,c) => s + (c.annual_budget||0), 0)
  const totalActual = data.reduce((s,c) => s + (c.ytd_actual||0), 0)
  const overallPct  = totalBudget ? Math.round(totalActual*100/totalBudget) : 0

  return (
    <div>
      {/* Budget overview */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10,
        padding:'14px 16px', marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>
            Overall Budget Utilization
          </div>
          <div style={{ fontSize:14, fontWeight:800,
            color: overallPct > 90 ? '#ef4444' : overallPct > 70 ? '#f59e0b' : '#10b981' }}>
            {overallPct}%
          </div>
        </div>
        <ProgressBar
          value={overallPct}
          color={overallPct > 90 ? '#ef4444' : overallPct > 70 ? '#f59e0b' : '#10b981'}
          size='lg'
        />
        <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11, color:'#64748b' }}>
          <span>Budget: <strong>NPR {(totalBudget/1000000).toFixed(2)}M</strong></span>
          <span>Actual: <strong>NPR {(totalActual/1000000).toFixed(2)}M</strong></span>
          <span>Variance: <strong>NPR {((totalBudget-totalActual)/1000000).toFixed(2)}M</strong></span>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {data.map(cc => {
          const pct = cc.utilization_pct || 0
          const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981'
          return (
            <div key={cc.id} style={{ background:'#fff', border:'1px solid #e2e8f0',
              borderRadius:10, padding:'12px 14px',
              borderLeft:`4px solid ${color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{cc.name}</div>
                  <div style={{ fontSize:10, color:'#94a3b8' }}>
                    {cc.code} · GL: {cc.gl_account_code} · {cc.dept_name}
                  </div>
                </div>
                <Pill color={cc.cc_type==='operational'?'blue':cc.cc_type==='investment'?'purple':'gray'}>
                  {cc.cc_type}
                </Pill>
                <span style={{ fontSize:13, fontWeight:800, color }}>
                  {pct}%
                </span>
              </div>

              <div style={{ marginBottom:6 }}>
                <ProgressBar value={pct} color={color} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {[
                  { label:'Budget',    value:`${(cc.annual_budget/1000000).toFixed(2)}M NPR` },
                  { label:'YTD Actual',value:`${(cc.ytd_actual/1000000).toFixed(2)}M NPR`   },
                  { label:'Variance',  value:`${(cc.budget_variance/1000000).toFixed(2)}M NPR` },
                ].map((m,i) => (
                  <div key={i} style={{ background:'#f8fafc', borderRadius:6,
                    padding:'5px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:9, color:'#94a3b8' }}>{m.label}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#0f172a' }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop:6, fontSize:10, color:'#64748b' }}>
                Approver: {cc.approver_name}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section: Work Locations ───────────────────────────────────
function WorkLocationsSection({ data }) {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        <StatMini icon="🌍" label="Total Locations" value={data.length} color="#3b82f6" />
        <StatMini icon="👥" label="Total Headcount"
          value={data.reduce((s,l)=>s+(l.current_headcount||0),0).toLocaleString()} color="#10b981" />
        <StatMini icon="🌐" label="Countries"
          value={[...new Set(data.map(l=>l.country_code))].length} color="#f59e0b" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {data.map((loc, idx) => {
          const cfg = LOC_CFG[loc.location_type] || LOC_CFG.office
          const pct = loc.max_capacity > 0
            ? Math.round(loc.current_headcount * 100 / loc.max_capacity)
            : 0

          return (
            <div key={loc.id} style={{ background:'#fff',
              border:`1px solid ${cfg.color}30`,
              borderRadius:10, padding:'12px 14px',
              borderLeft:`4px solid ${cfg.color}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:22 }}>{cfg.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#0f172a',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {loc.name}
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8' }}>
                    {loc.code} · {loc.city}, {loc.country_name}
                  </div>
                </div>
                {loc.is_primary && <Pill color="blue">HQ</Pill>}
              </div>

              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                <Pill color="gray">🕐 UTC{loc.utc_offset}</Pill>
                {loc.supports_hybrid && <Pill color="cyan">Hybrid</Pill>}
                {loc.supports_remote && <Pill color="orange">Remote OK</Pill>}
              </div>

              {loc.max_capacity && (
                <div style={{ marginBottom:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    fontSize:10, marginBottom:2 }}>
                    <span style={{ color:'#94a3b8' }}>Capacity</span>
                    <span style={{ fontWeight:700 }}>
                      {loc.current_headcount}/{loc.max_capacity} ({capPct}%)
                    </span>
                  </div>
                  <ProgressBar value={capPct} color={cfg.color} />
                </div>
              )}

              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
                {loc.local_minimum_wage && (
                  <div style={{ fontSize:10, color:'#64748b' }}>
                    💰 Min wage: {loc.local_minimum_wage.toLocaleString()} {loc.minimum_wage_currency}/mo
                  </div>
                )}
              </div>

              {loc.labour_office_zone && (
                <div style={{ fontSize:10, color:'#64748b', marginTop:4 }}>
                  ⚖️ DoL: {loc.labour_office_zone}
                </div>
              )}

              <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                {loc.facilities?.canteen && <span style={{ fontSize:10 }}>🍽️ Canteen</span>}
                {loc.facilities?.medical && <span style={{ fontSize:10 }}>🏥 Medical</span>}
                {loc.facilities?.parking && <span style={{ fontSize:10 }}>🅿️ Parking</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Org Tree Visualization ────────────────────────────────────
function OrgTreeView({ data }) {
  return (
    <div style={{ background:'#f8fafc', borderRadius:10, padding:16,
      overflowX:'auto', minHeight:300 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'#334155', marginBottom:14 }}>
        📊 Organization Hierarchy — Node Tree
      </div>
      <div style={{ display:'flex', gap:24, overflowX:'auto' }}>
        {data.businessUnits.slice(0,2).map(bu => (
          <div key={bu.id} style={{ minWidth:220 }}>
            {/* BU Node */}
            <div style={{ background:'#1e40af', color:'#fff', borderRadius:10,
              padding:'10px 14px', marginBottom:8, textAlign:'center' }}>
              <div style={{ fontSize:16, marginBottom:4 }}>🏛️</div>
              <div style={{ fontSize:11, fontWeight:800 }}>{bu.name}</div>
              <div style={{ fontSize:9, opacity:.7 }}>{bu.code}</div>
              <div style={{ fontSize:10, marginTop:4 }}>👥 {bu.employee_count.toLocaleString()}</div>
            </div>
            {/* Dept nodes */}
            <div style={{ borderLeft:'2px solid #bfdbfe', paddingLeft:12, marginLeft:14 }}>
              {data.departments.slice(0,3).map(dept => (
                <div key={dept.id} style={{ marginBottom:8, position:'relative' }}>
                  <div style={{ position:'absolute', left:-14, top:'50%',
                    width:12, height:2, background:'#bfdbfe', transform:'translateY(-50%)' }}/>
                  <div style={{ background:'#fff', border:'1px solid #bfdbfe',
                    borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#0f172a' }}>
                      {dept.name}
                    </div>
                    <div style={{ fontSize:9, color:'#94a3b8' }}>
                      👥 {dept.current_headcount} · {dept.dept_head_name}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize:10, color:'#94a3b8', fontStyle:'italic' }}>
                + {Math.max(0,data.departments.length-3)} more departments...
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function DeptTeamSetupPage() {
  const { persona, cc: currencyCtx } = useApp()

  const [activeTab, setActiveTab] = useState('overview')

  const TABS = [
    { id:'overview',   icon:'📊', label:'Overview'              },
    { id:'bu',         icon:'🏛️', label:'Business Units'        },
    { id:'dept',       icon:'🏢', label:'Departments'           },
    { id:'section',    icon:'🔀', label:'Sections & Units'      },
    { id:'team',       icon:'👥', label:'Teams'                 },
    { id:'costcenter', icon:'💰', label:'Cost Centers'          },
    { id:'location',   icon:'📍', label:'Work Locations'        },
  ]

  const data = MOCK_DATA

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <h2 style={{ fontSize:22, fontWeight:900, color:'#0f172a', margin:0 }}>
            Department & Team Setup
          </h2>
          <span style={{ background:'#eff6ff', color:'#1d4ed8', fontSize:11,
            fontWeight:700, padding:'3px 10px', borderRadius:20, border:'1px solid #bfdbfe' }}>
            Organization Management
          </span>
          <span style={{ background:'#f0fdf4', color:'#15803d', fontSize:11,
            fontWeight:700, padding:'3px 10px', borderRadius:20, border:'1px solid #bbf7d0' }}>
            🧠 AI-Driven
          </span>
        </div>
        <p style={{ fontSize:12, color:'#94a3b8', margin:'6px 0 0' }}>
          Master Data Management — Business Unit → Department → Section → Team → Cost Center → Work Location
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, background:'#f1f5f9', padding:4,
        borderRadius:12, marginBottom:20, overflowX:'auto', scrollbarWidth:'none',
        border:'1px solid #e2e8f0' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flexShrink:0, padding:'7px 14px', borderRadius:9, border:'none',
              background: activeTab===tab.id ? '#fff' : 'transparent',
              color: activeTab===tab.id ? '#0f172a' : '#64748b',
              fontWeight: activeTab===tab.id ? 700 : 400, fontSize:12, cursor:'pointer',
              boxShadow: activeTab===tab.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              display:'flex', alignItems:'center', gap:5 }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:16 }}>
            <StatMini icon="🏛️" label="Business Units" value={data.businessUnits.length}  color="#3b82f6" />
            <StatMini icon="🏢" label="Departments"    value={data.departments.length}     color="#8b5cf6" />
            <StatMini icon="🔀" label="Sections/Units" value={data.sections.length}        color="#10b981" />
            <StatMini icon="👥" label="Teams"          value={data.teams.length}           color="#f59e0b" />
            <StatMini icon="💰" label="Cost Centers"   value={data.costCenters.length}     color="#ef4444" />
            <StatMini icon="📍" label="Locations"      value={data.workLocations.length}   color="#06b6d4" />
          </div>

          <OrgTreeView data={data} />

          <div style={{ marginTop:16 }}>
            <AIInsightBox
              summary="Organization structure is well-defined with clear hierarchy. Nepal Labour Act 2074 compliance active for all committees. Ulrich Model (HRBP + CoE + HRSS) is implemented. Cost center budget utilization averaging 63% YTD — on track for fiscal year."
              score={87}
              observations={[
                "IT Department is approaching headcount limit (91% utilization)",
                "Global Remote Workers cost center needs dedicated management",
                "UK office below capacity (68.8%) — opportunity for growth"
              ]}
            />
          </div>
        </div>
      )}

      {activeTab === 'bu'         && <BusinessUnitsSection data={data.businessUnits} />}
      {activeTab === 'dept'       && <DepartmentsSection   data={data.departments}   />}
      {activeTab === 'section'    && <SectionsSection      data={data.sections}      />}
      {activeTab === 'team'       && <TeamsSection         data={data.teams}         />}
      {activeTab === 'costcenter' && <CostCentersSection   data={data.costCenters}   />}
      {activeTab === 'location'   && <WorkLocationsSection data={data.workLocations} />}
    </div>
  )
}

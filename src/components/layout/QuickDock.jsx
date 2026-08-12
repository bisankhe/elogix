// FILE: src/components/layout/QuickDock.jsx
// eLogix HRMS — macOS-style Quick Access Dock
//
// Placed directly below the Navbar/Topbar area.
// Role-aware: different icons for Employee, Manager, HR, Finance, C-Level.
// Animated hover (scale + tooltip). Active item highlights.
// Click opens relevant page via navTo. AI button opens HR Co-Pilot.
// Customizable: user can click ⚙ to see all options.

import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'

// ── DOCK ITEMS PER ROLE ───────────────────────────────────────
// emoji  = the icon displayed
// label  = tooltip + text label
// page   = page ID passed to navTo()
// action = special action key (for non-navigation items)
// color  = accent color for this item

const DOCK_CONFIGS = {
  // ── SUPER ADMIN ──────────────────────────────────────────
  'super-admin': [
    { emoji:'🏠', label:'Dashboard',       page:'super-admin-dashboard', color:'#7c3aed' },
    { emoji:'👨‍💼', label:'Employees',       page:'employee-directory',    color:'#0284c7' },
    { emoji:'⏰', label:'Attendance',       page:'live-attendance',       color:'#0d9488' },
    { emoji:'📅', label:'Leave',            page:'leave-setup',           color:'#f59e0b' },
    { emoji:'💰', label:'Payroll',          page:'automated-payroll',     color:'#16a34a' },
    { emoji:'📊', label:'Analytics',        page:'bi-dashboard',          color:'#8b5cf6' },
    { emoji:'🤖', label:'AI Co-Pilot',      action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'📋', label:'Recruitment',      page:'ats-dashboard',         color:'#e11d48' },
    { emoji:'🎯', label:'Performance',      page:'performance-dashboard', color:'#0ea5e9' },
    { emoji:'🔔', label:'Notifications',    action:'notif',               color:'#f97316' },
    { emoji:'⚙️', label:'Settings',         page:'system-setting',        color:'#64748b' },
  ],

  // ── EXECUTIVE / C-LEVEL ──────────────────────────────────
  executive: [
    { emoji:'🏠', label:'Dashboard',        page:'executive-dashboard',   color:'#7c3aed' },
    { emoji:'📊', label:'BI Reports',       page:'ai-business-intelligence',color:'#0284c7' },
    { emoji:'🔮', label:'Predictive AI',    page:'predictive-analytics',  color:'#8b5cf6' },
    { emoji:'👨‍💼', label:'Headcount',        page:'headcount-analysis',    color:'#0d9488' },
    { emoji:'⚠️', label:'Risk Brief',       page:'ai-attrition-prediction',color:'#e11d48' },
    { emoji:'🤖', label:'AI Co-Pilot',      action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'📈', label:'Performance',      page:'performance-dashboard', color:'#16a34a' },
    { emoji:'💰', label:'Payroll Snap',     page:'payroll-snapshot',      color:'#f59e0b' },
    { emoji:'🔔', label:'Notifications',    action:'notif',               color:'#f97316' },
    { emoji:'👤', label:'My Profile',       page:'employee-profile',      color:'#64748b' },
  ],

  // ── HR MANAGER ───────────────────────────────────────────
  hr: [
    { emoji:'🏠', label:'Dashboard',        page:'hr-dashboard',          color:'#7c3aed' },
    { emoji:'👨‍💼', label:'Employees',        page:'employee-directory',    color:'#0284c7' },
    { emoji:'⏰', label:'Attendance',        page:'live-attendance',       color:'#0d9488' },
    { emoji:'📅', label:'Leave',             page:'leave-approval',        color:'#f59e0b' },
    { emoji:'💰', label:'Payroll',           page:'automated-payroll',     color:'#16a34a' },
    { emoji:'🤖', label:'AI Co-Pilot',       action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'📋', label:'Recruitment',       page:'ats-dashboard',         color:'#e11d48' },
    { emoji:'🎯', label:'Performance',       page:'performance-dashboard', color:'#0ea5e9' },
    { emoji:'📣', label:'Announcements',     page:'announcement-board',    color:'#8b5cf6' },
    { emoji:'🔔', label:'Notifications',     action:'notif',               color:'#f97316' },
    { emoji:'⚙️', label:'Settings',          page:'system-setting',        color:'#64748b' },
  ],

  // ── DEPARTMENT HEAD ──────────────────────────────────────
  department: [
    { emoji:'🏠', label:'Dashboard',        page:'department-dashboard',  color:'#7c3aed' },
    { emoji:'👥', label:'My Team',          page:'employee-directory',    color:'#0284c7' },
    { emoji:'⏰', label:'Attendance',        page:'live-attendance',       color:'#0d9488' },
    { emoji:'✅', label:'Approvals',         page:'leave-approval',        color:'#16a34a' },
    { emoji:'📅', label:'Leave',             page:'leave-calendar',        color:'#f59e0b' },
    { emoji:'🤖', label:'AI Co-Pilot',       action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'🎯', label:'Goals / OKR',       page:'okr-management',        color:'#8b5cf6' },
    { emoji:'📊', label:'Reports',           page:'bi-dashboard',          color:'#0ea5e9' },
    { emoji:'🎓', label:'Training',          page:'course-management',     color:'#e11d48' },
    { emoji:'🔔', label:'Notifications',     action:'notif',               color:'#f97316' },
    { emoji:'👤', label:'My Profile',        page:'employee-profile',      color:'#64748b' },
  ],

  // ── BRANCH MANAGER ───────────────────────────────────────
  branch: [
    { emoji:'🏠', label:'Dashboard',        page:'super-admin-dashboard', color:'#7c3aed' },
    { emoji:'👥', label:'Team',             page:'employee-directory',    color:'#0284c7' },
    { emoji:'⏰', label:'Attendance',        page:'live-attendance',       color:'#0d9488' },
    { emoji:'✅', label:'Approvals',         page:'leave-approval',        color:'#16a34a' },
    { emoji:'📅', label:'Leave',             page:'leave-calendar',        color:'#f59e0b' },
    { emoji:'🤖', label:'AI Co-Pilot',       action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'📊', label:'Reports',           page:'bi-dashboard',          color:'#8b5cf6' },
    { emoji:'🔔', label:'Notifications',     action:'notif',               color:'#f97316' },
    { emoji:'👤', label:'My Profile',        page:'employee-profile',      color:'#64748b' },
  ],

  // ── EMPLOYEE (ESS) ───────────────────────────────────────
  employee: [
    { emoji:'🏠', label:'Home',             page:'employee-dashboard',    color:'#7c3aed' },
    { emoji:'⏰', label:'My Attendance',     page:'live-attendance',       color:'#0d9488' },
    { emoji:'📅', label:'Apply Leave',       page:'leave-request',         color:'#f59e0b' },
    { emoji:'🌴', label:'Leave Balance',     page:'leave-balance',         color:'#16a34a' },
    { emoji:'💰', label:'My Payslip',        page:'payslip-generation',    color:'#0284c7' },
    { emoji:'🤖', label:'AI Co-Pilot',       action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'📄', label:'My Documents',      page:'document-management',   color:'#8b5cf6' },
    { emoji:'📣', label:'Announcements',     page:'announcement-board',    color:'#e11d48' },
    { emoji:'🎯', label:'My Goals',          page:'goal-assignment',       color:'#0ea5e9' },
    { emoji:'🔔', label:'Notifications',     action:'notif',               color:'#f97316' },
    { emoji:'👤', label:'My Profile',        page:'employee-profile',      color:'#64748b' },
  ],

  // ── FINANCE ──────────────────────────────────────────────
  finance: [
    { emoji:'🏠', label:'Dashboard',        page:'finance-dashboard',     color:'#7c3aed' },
    { emoji:'💰', label:'Payroll',          page:'automated-payroll',     color:'#16a34a' },
    { emoji:'🏦', label:'SSF / Tax',        page:'ssf-information',       color:'#0284c7' },
    { emoji:'💵', label:'Payslips',         page:'payslip-generation',    color:'#0d9488' },
    { emoji:'📊', label:'Cost Reports',     page:'payroll-reports',       color:'#8b5cf6' },
    { emoji:'🤖', label:'AI Co-Pilot',      action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'🧾', label:'Bank Transfer',    page:'bank-transfer-file',    color:'#f59e0b' },
    { emoji:'⚖️', label:'Compliance',       page:'compliance-setup',      color:'#e11d48' },
    { emoji:'🔔', label:'Notifications',    action:'notif',               color:'#f97316' },
    { emoji:'👤', label:'My Profile',       page:'employee-profile',      color:'#64748b' },
  ],

  // ── IT ADMIN ─────────────────────────────────────────────
  'it-admin': [
    { emoji:'🏠', label:'Dashboard',        page:'super-admin-dashboard', color:'#7c3aed' },
    { emoji:'⚙️', label:'System Settings',  page:'system-setting',        color:'#64748b' },
    { emoji:'👥', label:'User Management',  page:'user-management',       color:'#0284c7' },
    { emoji:'🔒', label:'Permissions',      page:'permission-matrix',     color:'#e11d48' },
    { emoji:'🔗', label:'Integrations',     page:'integration-hub',       color:'#0d9488' },
    { emoji:'🤖', label:'AI Co-Pilot',      action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'📋', label:'Audit Logs',       page:'audit-logs',            color:'#8b5cf6' },
    { emoji:'🔔', label:'Notifications',    action:'notif',               color:'#f97316' },
    { emoji:'👤', label:'My Profile',       page:'employee-profile',      color:'#64748b' },
  ],

  // ── RECRUITMENT ──────────────────────────────────────────
  recruitment: [
    { emoji:'🏠', label:'Dashboard',        page:'ats-dashboard',         color:'#7c3aed' },
    { emoji:'📋', label:'Job Postings',     page:'job-posting',           color:'#0284c7' },
    { emoji:'👤', label:'Candidates',       page:'candidate-database',    color:'#0d9488' },
    { emoji:'📅', label:'Interviews',       page:'interview-scheduling',  color:'#f59e0b' },
    { emoji:'📝', label:'Offer Letters',    page:'offer-management',      color:'#16a34a' },
    { emoji:'🤖', label:'AI Co-Pilot',      action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'🏆', label:'Talent Pool',      page:'talent-pool',           color:'#8b5cf6' },
    { emoji:'🔔', label:'Notifications',    action:'notif',               color:'#f97316' },
    { emoji:'👤', label:'My Profile',       page:'employee-profile',      color:'#64748b' },
  ],
}

// Fallback dock for any unmatched persona
const DEFAULT_DOCK = [
  { emoji:'🏠', label:'Home',              page:'super-admin-dashboard', color:'#7c3aed' },
  { emoji:'⏰', label:'Attendance',         page:'live-attendance',       color:'#0d9488' },
  { emoji:'📅', label:'Leave',              page:'leave-request',         color:'#f59e0b' },
  { emoji:'💰', label:'Payroll',            page:'automated-payroll',     color:'#16a34a' },
  { emoji:'🤖', label:'AI Co-Pilot',        action:'ai',                  color:'#7c3aed', center:true },
  { emoji:'📄', label:'Documents',          page:'document-management',   color:'#8b5cf6' },
  { emoji:'🔔', label:'Notifications',      action:'notif',               color:'#f97316' },
  { emoji:'👤', label:'Profile',            page:'employee-profile',      color:'#64748b' },
]

// ── SINGLE DOCK ITEM ──────────────────────────────────────────
function DockItem({ item, isActive, onClick, darkMode }) {
  const [hovered, setHovered] = useState(false)
  const isCenter = !!item.center

  return (
    <div
      style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
    >
      {/* Tooltip */}
      {hovered && (
        <div style={{
          position:'absolute', bottom:'calc(100% + 8px)',
          left:'50%', transform:'translateX(-50%)',
          background:'#0f172a', color:'#fff',
          fontSize:10, fontWeight:700, whiteSpace:'nowrap',
          padding:'4px 10px', borderRadius:8,
          boxShadow:'0 4px 16px rgba(0,0,0,.3)',
          zIndex:200, pointerEvents:'none',
        }}>
          {item.label}
          {/* Arrow */}
          <div style={{
            position:'absolute', top:'100%', left:'50%',
            transform:'translateX(-50%)',
            width:0, height:0,
            borderLeft:'5px solid transparent',
            borderRight:'5px solid transparent',
            borderTop:'5px solid #0f172a',
          }}/>
        </div>
      )}

      {/* Icon button */}
      <button
        onClick={onClick}
        title={item.label}
        style={{
          width: isCenter ? 46 : 38,
          height: isCenter ? 46 : 38,
          borderRadius: isCenter ? '50%' : 10,
          border: 'none',
          background: isCenter
            ? `linear-gradient(135deg, #1e1b4b 0%, ${item.color} 60%, #c4b5fd 100%)`
            : isActive
              ? `${item.color}18`
              : hovered
                ? `${item.color}12`
                : darkMode ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.9)',
        }}
      >
        {item.emoji}
      </button>

      {/* Label */}
      <span style={{
        fontSize: 8,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? item.color : darkMode ? 'rgba(255,255,255,.55)' : '#64748b',
        maxWidth: 46, textAlign:'center', lineHeight:1.2,
        transition:'color .2s',
        userSelect:'none',
      }}>
        {item.label}
      </span>

      {/* Active dot */}
      {isActive && (
        <div style={{
          width:4, height:4, borderRadius:'50%',
          background:item.color, marginTop:-1,
        }}/>
      )}
    </div>
  )
}

// ── MAIN DOCK COMPONENT ───────────────────────────────────────
export default function QuickDock() {
  const { navTo, currentPersona, persona, sub, darkMode, setShowNotif, setShowAI } = useApp()

  // Get dock items for current persona
  const personaId = currentPersona?.id || ''
  const items = DOCK_CONFIGS[personaId] || DEFAULT_DOCK

  const handleClick = (item) => {
    if (item.action === 'ai') {
      // Toggle HR Co-Pilot panel
      // Find the floating button and click it, or set a global state
      const btn = document.querySelector('[data-copilot-toggle]')
      if (btn) btn.click()
      else setShowAI(v => !v)
    } else if (item.action === 'notif') {
      setShowNotif(v => !v)
    } else if (item.page && navTo) {
      navTo(item.page)
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Quick Access Dock"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 6,
        padding: '6px 16px 8px',
        background: darkMode
          ? 'rgba(15,23,42,.95)'
          : 'rgba(248,250,252,.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: darkMode ? '1px solid rgba(255,255,255,.07)' : '1px solid #e2e8f0',
        flexShrink: 0,
        zIndex: 50,
        overflowX: 'auto',
        // Hide scrollbar but allow scroll on small screens
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {items.map((item, i) => {
        const isActive = item.page && sub === item.page
        return (
          <DockItem
            key={i}
            item={item}
            isActive={isActive}
            onClick={() => handleClick(item)}
            darkMode={darkMode}
          />
        )
      })}
    </div>
  )
}

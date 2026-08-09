// ============================================================
// FILE: src/components/dashboard/snapshots/OrgChartPage.jsx
// PURPOSE: AI-Driven Organization Chart
//          - Interactive visual org tree (top-down + matrix)
//          - Real-time node details on click
//          - AI assistant panel (natural language queries)
//          - Span-of-control overlay
//          - Vacancy / attrition risk overlay
//          - Department color-coding
//          - Scenario planning (what-if restructure)
//          - Historical snapshots
// ============================================================

import { useState, useRef, useCallback } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

// ── Full org data (extended from Position Management) ─────────
const ORG_NODES = [
  // ── CEO Level ───────────────────────────────────────────────
  {
    id:'ceo', code:'POS-EXEC-CEO', title:'Chief Executive Officer', grade:'E2',
    family:'EXEC', dept:'Executive', dept_color:'#0ea5e9',
    status:'filled', fte:1.00, budget:1800000,
    incumbent:'Rajesh Adhikari', initials:'RA', avatar_color:'#0ea5e9',
    since:'2019-01-01', level:0, parent_id:null, dotted_to_id:null,
    attrition:'low', risk_score:8, succession:true, direct_reports:5,
    managerial:true, location:'Kathmandu HQ',
    skills:['Strategy','Leadership','P&L','Board Relations'],
    ai_insight:'Strong tenure. Low flight risk. Succession plan active.',
  },
  // ── C-Suite ─────────────────────────────────────────────────
  {
    id:'cto', code:'POS-IT-CTO', title:'Chief Technology Officer', grade:'E1',
    family:'IT', dept:'Information Technology', dept_color:'#3b82f6',
    status:'filled', fte:1.00, budget:900000,
    incumbent:'Bikram Shrestha', initials:'BS', avatar_color:'#3b82f6',
    since:'2022-01-15', level:1, parent_id:'ceo', dotted_to_id:null,
    attrition:'low', risk_score:12, succession:true, direct_reports:4,
    managerial:true, location:'Kathmandu HQ',
    skills:['Architecture','Cloud','AI/ML','Team Building'],
    ai_insight:'High performer. Key technical decision maker. Ensure retention package is competitive.',
  },
  {
    id:'cfo', code:'POS-FIN-CFO', title:'Chief Financial Officer', grade:'E1',
    family:'FIN', dept:'Finance & Accounts', dept_color:'#10b981',
    status:'filled', fte:1.00, budget:850000,
    incumbent:'Meena Pradhan', initials:'MP', avatar_color:'#10b981',
    since:'2020-08-01', level:1, parent_id:'ceo', dotted_to_id:null,
    attrition:'low', risk_score:15, succession:false, direct_reports:3,
    managerial:true, location:'Kathmandu HQ',
    skills:['Financial Planning','Tax','Compliance','ERP'],
    ai_insight:'Solid performer. No succession plan in place — recommend developing Finance Manager as backup.',
  },
  {
    id:'coo', code:'POS-OPS-COO', title:'Chief Operating Officer', grade:'E1',
    family:'OPS', dept:'Operations', dept_color:'#ef4444',
    status:'filled', fte:1.00, budget:820000,
    incumbent:'Suresh Karki', initials:'SK', avatar_color:'#ef4444',
    since:'2021-03-15', level:1, parent_id:'ceo', dotted_to_id:null,
    attrition:'medium', risk_score:38, succession:false, direct_reports:4,
    managerial:true, location:'Kathmandu HQ',
    skills:['Process Optimization','Supply Chain','Agile','P&L'],
    ai_insight:'Risk score elevated. Recent market activity shows similar profiles being recruited externally.',
  },
  {
    id:'hrd', code:'POS-HR-DIR', title:'HR Director', grade:'M3',
    family:'HR', dept:'Human Resources', dept_color:'#8b5cf6',
    status:'filled', fte:1.00, budget:400000,
    incumbent:'Sita Sharma', initials:'SS', avatar_color:'#8b5cf6',
    since:'2021-06-01', level:1, parent_id:'ceo', dotted_to_id:null,
    attrition:'low', risk_score:18, succession:true, direct_reports:5,
    managerial:true, location:'Kathmandu HQ',
    skills:['Labour Law','HRBP','OD','Compliance'],
    ai_insight:'Excellent retention. Strong succession pipeline. Leads 5 HRBPs across business units.',
  },
  {
    id:'cmdo', code:'POS-MKT-CMO', title:'Chief Marketing Officer', grade:'E1',
    family:'SALES', dept:'Sales & Marketing', dept_color:'#f59e0b',
    status:'vacant', fte:1.00, budget:750000,
    incumbent:null, initials:'CMO', avatar_color:'#f59e0b',
    since:null, level:1, parent_id:'ceo', dotted_to_id:null,
    attrition:'low', risk_score:null, succession:false, direct_reports:0,
    managerial:true, location:'Kathmandu HQ',
    skills:['Brand Strategy','Digital Marketing','Growth'],
    ai_insight:'Position vacant 47 days. Recommend external search. 3 internal candidates identified by AI.',
  },
  // ── IT Department ───────────────────────────────────────────
  {
    id:'em_fe', code:'POS-IT-EM-001', title:'Engineering Manager (FE)', grade:'M1',
    family:'IT', dept:'Information Technology', dept_color:'#3b82f6',
    status:'filled', fte:1.00, budget:180000,
    incumbent:'Roshan Thapa', initials:'RT', avatar_color:'#3b82f6',
    since:'2023-03-10', level:2, parent_id:'cto', dotted_to_id:null,
    attrition:'medium', risk_score:45, succession:false, direct_reports:8,
    managerial:true, location:'Kathmandu HQ',
    skills:['React','TypeScript','Team Lead','Agile'],
    ai_insight:'Span of control at 8 — approaching maximum. Consider promoting a Tech Lead. Attrition risk elevated.',
  },
  {
    id:'em_be', code:'POS-IT-EM-002', title:'Engineering Manager (BE)', grade:'M1',
    family:'IT', dept:'Information Technology', dept_color:'#3b82f6',
    status:'filled', fte:1.00, budget:180000,
    incumbent:'Anita Karki', initials:'AK', avatar_color:'#60a5fa',
    since:'2022-09-15', level:2, parent_id:'cto', dotted_to_id:null,
    attrition:'low', risk_score:22, succession:true, direct_reports:6,
    managerial:true, location:'Kathmandu HQ',
    skills:['Python','PostgreSQL','Flask','Docker'],
    ai_insight:'Strong performer with clear succession. API team well-structured.',
  },
  {
    id:'tl', code:'POS-IT-TL-001', title:'Tech Lead', grade:'L4',
    family:'IT', dept:'Information Technology', dept_color:'#3b82f6',
    status:'filled', fte:1.00, budget:120000,
    incumbent:'Ram Bista', initials:'RB', avatar_color:'#93c5fd',
    since:'2023-01-20', level:3, parent_id:'em_fe', dotted_to_id:null,
    attrition:'medium', risk_score:55, succession:false, direct_reports:0,
    managerial:false, location:'Kathmandu HQ',
    skills:['React','Architecture','Mentoring'],
    ai_insight:'Key technical contributor. 55% flight risk — consider promotion to Manager track.',
  },
  {
    id:'se1', code:'POS-IT-SE-001', title:'Senior Engineer', grade:'L3',
    family:'IT', dept:'Information Technology', dept_color:'#3b82f6',
    status:'filled', fte:1.00, budget:70000,
    incumbent:'Prabesh Tamang', initials:'PT', avatar_color:'#93c5fd',
    since:'2023-06-01', level:3, parent_id:'em_be', dotted_to_id:null,
    attrition:'low', risk_score:18, succession:false, direct_reports:0,
    managerial:false, location:'Remote',
    skills:['Python','FastAPI','PostgreSQL'],
    ai_insight:'Solid performer. Remote-first — ensure engagement.',
  },
  {
    id:'se_vacant', code:'POS-IT-SE-002', title:'Senior Engineer', grade:'L3',
    family:'IT', dept:'Information Technology', dept_color:'#3b82f6',
    status:'vacant', fte:1.00, budget:70000,
    incumbent:null, initials:'?', avatar_color:'#94a3b8',
    since:null, level:3, parent_id:'em_be', dotted_to_id:null,
    attrition:'low', risk_score:null, succession:false, direct_reports:0,
    managerial:false, location:'Kathmandu HQ',
    skills:['Backend Development'],
    ai_insight:'Vacancy open 23 days. 4 candidates in pipeline — 1 at final interview stage.',
  },
  // ── HR Department ───────────────────────────────────────────
  {
    id:'hrbp_it', code:'POS-HR-HRBP-001', title:'HRBP — Technology', grade:'M1',
    family:'HR', dept:'Human Resources', dept_color:'#8b5cf6',
    status:'filled', fte:1.00, budget:120000,
    incumbent:'Priya Rai', initials:'PR', avatar_color:'#a78bfa',
    since:'2023-07-01', level:2, parent_id:'hrd', dotted_to_id:'cto',
    attrition:'high', risk_score:72, succession:false, direct_reports:0,
    managerial:true, location:'Kathmandu HQ',
    skills:['HRBP','Labour Law','Talent Dev','Nepal Law'],
    ai_insight:'HIGH RISK: 72% attrition probability. LinkedIn activity increased 300% last 30 days. Initiate retention conversation immediately.',
  },
  {
    id:'recruiter', code:'POS-HR-REC-001', title:'Senior Recruiter', grade:'L3',
    family:'HR', dept:'Human Resources', dept_color:'#8b5cf6',
    status:'filled', fte:1.00, budget:65000,
    incumbent:'Gita Lama', initials:'GL', avatar_color:'#c4b5fd',
    since:'2022-04-01', level:2, parent_id:'hrd', dotted_to_id:null,
    attrition:'low', risk_score:12, succession:false, direct_reports:0,
    managerial:false, location:'Kathmandu HQ',
    skills:['Talent Acquisition','ATS','Interviewing'],
    ai_insight:'High performer. Avg time-to-hire: 22 days (industry avg: 35). Excellent quality of hire score.',
  },
  // ── Finance Department ──────────────────────────────────────
  {
    id:'fin_mgr', code:'POS-FIN-MGR-001', title:'Finance Manager', grade:'M1',
    family:'FIN', dept:'Finance & Accounts', dept_color:'#10b981',
    status:'filled', fte:1.00, budget:160000,
    incumbent:'Hari KC', initials:'HK', avatar_color:'#34d399',
    since:'2021-04-01', level:2, parent_id:'cfo', dotted_to_id:null,
    attrition:'low', risk_score:15, succession:false, direct_reports:3,
    managerial:true, location:'Kathmandu HQ',
    skills:['ICAN','Tally','Tax Compliance','Payroll'],
    ai_insight:'Reliable finance anchor. No succession plan — recommend identifying successor.',
  },
  // ── Operations ──────────────────────────────────────────────
  {
    id:'pm', code:'POS-OPS-PM-001', title:'Project Manager', grade:'L4',
    family:'OPS', dept:'Operations', dept_color:'#ef4444',
    status:'filled', fte:1.00, budget:100000,
    incumbent:'Dev Poudel', initials:'DP', avatar_color:'#fca5a5',
    since:'2022-11-01', level:2, parent_id:'coo', dotted_to_id:'cto',
    attrition:'medium', risk_score:48, succession:false, direct_reports:3,
    managerial:false, location:'Hybrid',
    skills:['PMP','Agile','Budget Mgmt','Stakeholder Mgmt'],
    ai_insight:'Cross-functional role. Dotted-line to CTO for tech projects. Monitor workload — dual reporting can cause burnout.',
  },
]

// ── Color & config maps ───────────────────────────────────────
const DEPT_COLORS = {
  'Executive':            '#0ea5e9',
  'Information Technology':'#3b82f6',
  'Finance & Accounts':   '#10b981',
  'Human Resources':      '#8b5cf6',
  'Sales & Marketing':    '#f59e0b',
  'Operations':           '#ef4444',
}

const RISK_CFG = {
  low:     { color:'#10b981', bg:'#f0fdf4', label:'Low'    },
  medium:  { color:'#f59e0b', bg:'#fffbeb', label:'Medium' },
  high:    { color:'#ef4444', bg:'#fef2f2', label:'High'   },
  critical:{ color:'#dc2626', bg:'#fef2f2', label:'Critical'},
}

const STATUS_CFG = {
  filled:  { border:'#10b981', bg:'#fff',    icon:'👤' },
  vacant:  { border:'#f59e0b', bg:'#fffbeb', icon:'○'  },
  frozen:  { border:'#94a3b8', bg:'#f8fafc', icon:'❄️' },
}

// ── AI Suggestions ────────────────────────────────────────────
const AI_SUGGESTIONS = [
  'Show all high attrition risk positions',
  'Who reports to the CTO?',
  'Show vacant positions only',
  'Which managers have span > 6?',
  'Show matrix / dotted-line reporting',
  'Show IT department only',
  'Identify positions with no succession plan',
]

const AI_RESPONSES = {
  'Show all high attrition risk positions': {
    filter:'high_risk',
    message:'Found 3 positions with elevated attrition risk. Priya Rai (HRBP — 72% risk) requires immediate retention action. Ram Bista (Tech Lead — 55% risk) is recommended for promotion. Roshan Thapa (Eng Mgr FE — 45% risk) is approaching span-of-control limit.',
    highlight:['hrbp_it','tl','em_fe'],
  },
  'Who reports to the CTO?': {
    filter:'cto_reports',
    message:'4 positions report directly to Bikram Shrestha (CTO): Engineering Manager (FE), Engineering Manager (BE), and 2 additional positions. Project Manager (Dev Poudel) has a dotted-line reporting to CTO as well.',
    highlight:['em_fe','em_be','pm','hrbp_it'],
  },
  'Show vacant positions only': {
    filter:'vacant',
    message:'2 positions are currently vacant: CMO (vacant 47 days — external search recommended) and Senior Engineer L3 (vacant 23 days — candidate in final interview).',
    highlight:['cmdo','se_vacant'],
  },
  'Which managers have span > 6?': {
    filter:'high_span',
    message:'Roshan Thapa (Eng Manager FE) has 8 direct reports — at maximum recommended span. Consider promoting Ram Bista (Tech Lead) to reduce load.',
    highlight:['em_fe'],
  },
}

// ── Pill component ────────────────────────────────────────────
function Pill({ children, color='blue' }) {
  const m = {
    green: {bg:'#f0fdf4',text:'#15803d',border:'#bbf7d0'},
    blue:  {bg:'#eff6ff',text:'#1d4ed8',border:'#bfdbfe'},
    yellow:{bg:'#fffbeb',text:'#b45309',border:'#fde68a'},
    red:   {bg:'#fef2f2',text:'#dc2626',border:'#fecaca'},
    gray:  {bg:'#f1f5f9',text:'#475569',border:'#e2e8f0'},
    purple:{bg:'#f5f3ff',text:'#6d28d9',border:'#ddd6fe'},
    orange:{bg:'#fff7ed',text:'#c2410c',border:'#fed7aa'},
  }
  const c = m[color]||m.blue
  return (
    <span style={{background:c.bg,color:c.text,border:`1px solid ${c.border}`,
      padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,
      whiteSpace:'nowrap',display:'inline-flex',alignItems:'center'}}>
      {children}
    </span>
  )
}

// ── Single Org Node Card ──────────────────────────────────────
function OrgNode({ node, isHighlighted, isSelected, overlay, onSelect, children }) {
  const st = STATUS_CFG[node.status] || STATUS_CFG.filled
  const rc = RISK_CFG[node.attrition] || RISK_CFG.low

  const showRisk    = overlay === 'attrition' && node.status === 'filled' && node.risk_score
  const showVacancy = overlay === 'vacancy'
  const showSpan    = overlay === 'span' && node.direct_reports > 0

  const borderColor = isHighlighted ? '#7c3aed'
    : isSelected    ? '#2563eb'
    : showRisk && node.risk_score > 60 ? '#ef4444'
    : st.border

  const glowStyle = isHighlighted
    ? '0 0 0 3px rgba(124,58,237,.25), 0 4px 16px rgba(0,0,0,.12)'
    : isSelected
    ? '0 0 0 2px rgba(37,99,235,.25), 0 4px 12px rgba(0,0,0,.1)'
    : '0 2px 8px rgba(0,0,0,.06)'

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
      {/* Node card */}
      <div
        onClick={() => onSelect(node)}
        style={{
          background: node.status==='vacant' ? '#fffbeb' : '#fff',
          border: `2px solid ${borderColor}`,
          borderRadius: 14,
          padding: '12px 14px',
          width: 190,
          cursor: 'pointer',
          boxShadow: glowStyle,
          transition: 'all .2s',
          position: 'relative',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          if (!isSelected && !isHighlighted)
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.12)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = glowStyle
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        {/* Status / overlay badges */}
        <div style={{position:'absolute',top:-8,right:8,display:'flex',gap:4}}>
          {node.status === 'vacant' && (
            <span style={{background:'#f59e0b',color:'#fff',fontSize:9,fontWeight:800,
              padding:'1px 6px',borderRadius:10}}>VACANT</span>
          )}
          {node.status === 'frozen' && (
            <span style={{background:'#94a3b8',color:'#fff',fontSize:9,fontWeight:800,
              padding:'1px 6px',borderRadius:10}}>FROZEN</span>
          )}
          {node.dotted_to_id && (
            <span style={{background:'#8b5cf6',color:'#fff',fontSize:9,fontWeight:800,
              padding:'1px 6px',borderRadius:10}}>MATRIX</span>
          )}
        </div>

        {/* Avatar + Name */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <div style={{
            width:36,height:36,borderRadius:10,flexShrink:0,
            background: node.status==='vacant'
              ? '#f1f5f9'
              : `${node.avatar_color}22`,
            border: `2px solid ${node.status==='vacant'?'#e2e8f0':node.avatar_color}`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize: node.status==='vacant' ? 18 : 13,
            fontWeight:800,
            color: node.status==='vacant' ? '#94a3b8' : node.avatar_color,
          }}>
            {node.status==='vacant' ? '○' : node.initials}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
              lineHeight:1.3}}>
              {node.incumbent || 'Vacant'}
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>
              {node.grade} · {node.location || 'HQ'}
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{fontSize:10,fontWeight:700,color:'#334155',
          overflow:'hidden',textOverflow:'ellipsis',
          whiteSpace:'nowrap',marginBottom:6,
          lineHeight:1.4}}>
          {node.title}
        </div>

        {/* Dept badge */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{background:`${node.dept_color}18`,color:node.dept_color,
            fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:6}}>
            {node.family}
          </span>

          {/* Overlay data */}
          {showRisk && (
            <span style={{background:rc.bg,color:rc.color,
              fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:6}}>
              🧠 {node.risk_score}% risk
            </span>
          )}
          {showVacancy && node.status==='filled' && (
            <span style={{background:'#f0fdf4',color:'#15803d',
              fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:6}}>
              ✓ Filled
            </span>
          )}
          {showSpan && (
            <span style={{
              background: node.direct_reports > 8 ? '#fef2f2' : '#f0fdf4',
              color: node.direct_reports > 8 ? '#dc2626' : '#15803d',
              fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:6}}>
              {node.direct_reports} reports
            </span>
          )}
          {!showRisk && !showVacancy && !showSpan && (
            <span style={{fontSize:9,color:'#94a3b8'}}>
              {node.direct_reports > 0 ? `${node.direct_reports} ↓` : ''}
            </span>
          )}
        </div>

        {/* Succession warning */}
        {!node.succession && node.status==='filled' && node.level<=2 && (
          <div style={{marginTop:5,fontSize:9,color:'#f59e0b',fontWeight:700}}>
            ⚠ No succession plan
          </div>
        )}
      </div>

      {/* Connector line to children */}
      {children && children.length > 0 && (
        <div style={{width:2,height:20,background:'#e2e8f0'}}/>
      )}

      {/* Children row */}
      {children && children.length > 0 && (
        <div style={{display:'flex',gap:12,alignItems:'flex-start',
          position:'relative',paddingTop:0}}>
          {/* Horizontal connector bar */}
          {children.length > 1 && (
            <div style={{
              position:'absolute',top:0,
              left: `calc(50% - ${(children.length-1)*101}px)`,
              width: `${(children.length-1)*202}px`,
              height:2,background:'#e2e8f0',
            }}/>
          )}
          {children}
        </div>
      )}
    </div>
  )
}

// ── Node Detail Panel ─────────────────────────────────────────
function NodeDetailPanel({ node, onClose }) {
  if (!node) return null

  return (
    <div style={{
      width:300,flexShrink:0,background:'#fff',
      border:'1px solid #e2e8f0',borderRadius:14,
      boxShadow:'0 4px 20px rgba(0,0,0,.1)',
      display:'flex',flexDirection:'column',
      overflow:'hidden',
      position:'sticky',top:0,maxHeight:'80vh',
    }}>
      {/* Header */}
      <div style={{padding:'14px 16px',
        background:`linear-gradient(135deg,${node.dept_color}dd,${node.dept_color})`,
        flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:44,height:44,borderRadius:12,
            background:'rgba(255,255,255,.2)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:16,fontWeight:800,color:'#fff',flexShrink:0}}>
            {node.status==='vacant'?'○':node.initials}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:900,color:'#fff',
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {node.incumbent || 'Vacant Position'}
            </div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.8)',marginTop:1}}>
              {node.title}
            </div>
          </div>
          <button onClick={onClose}
            style={{background:'rgba(255,255,255,.2)',border:'none',
              borderRadius:8,width:26,height:26,cursor:'pointer',
              color:'#fff',fontSize:14,flexShrink:0}}>
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:'auto',padding:'14px 16px'}}>

        {/* Status row */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          <Pill color={node.status==='filled'?'green':node.status==='vacant'?'yellow':'gray'}>
            {node.status==='filled'?'✓ Filled':'○ Vacant'}
          </Pill>
          <Pill color="blue">{node.grade}</Pill>
          {node.managerial && <Pill color="orange">Managerial</Pill>}
          {node.dotted_to_id && <Pill color="purple">Matrix</Pill>}
        </div>

        {/* Key info */}
        {[
          ['Position Code', node.code],
          ['Department',    node.dept],
          ['Location',      node.location||'Kathmandu HQ'],
          ['FTE',           node.fte.toFixed(2)],
          ['Budget/Month',  `NPR ${(node.budget/1000).toFixed(0)}K`],
          ['Since',         node.since||'—'],
          ['Direct Reports',node.direct_reports.toString()],
        ].map(([label,value],i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',
            padding:'6px 0',borderBottom:'1px solid #f8fafc',fontSize:11}}>
            <span style={{color:'#64748b'}}>{label}</span>
            <span style={{fontWeight:700,color:'#0f172a'}}>{value}</span>
          </div>
        ))}

        {/* Skills */}
        {node.skills?.length > 0 && (
          <div style={{marginTop:12}}>
            <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>
              Skills
            </div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {node.skills.map((s,i)=>(
                <span key={i} style={{background:'#f8fafc',border:'1px solid #e2e8f0',
                  padding:'2px 8px',borderRadius:8,fontSize:10,color:'#475569'}}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attrition risk */}
        {node.status==='filled' && node.risk_score && (
          <div style={{marginTop:12,background:rc.bg,border:`1px solid ${rc.color}30`,
            borderRadius:10,padding:'10px 12px'}}>
            <div style={{display:'flex',justifyContent:'space-between',
              fontSize:11,marginBottom:6}}>
              <span style={{fontWeight:700,color:rc.color}}>🧠 Attrition Risk</span>
              <span style={{fontWeight:900,color:rc.color,fontSize:14}}>
                {node.risk_score}%
              </span>
            </div>
            <div style={{height:6,background:'rgba(0,0,0,.08)',borderRadius:6,overflow:'hidden'}}>
              <div style={{width:`${node.risk_score}%`,height:'100%',
                background:rc.color,borderRadius:6,transition:'width .5s'}}/>
            </div>
          </div>
        )}

        {/* AI Insight */}
        {node.ai_insight && (
          <div style={{marginTop:12,background:'linear-gradient(135deg,#f5f3ff,#eff6ff)',
            border:'1px solid #c4b5fd',borderRadius:10,padding:'10px 12px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#1e1b4b',marginBottom:5}}>
              🧠 AI Insight
            </div>
            <div style={{fontSize:11,color:'#4c1d95',lineHeight:1.6}}>
              {node.ai_insight}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:6}}>
          {node.status==='vacant' && (
            <button style={{padding:'8px',borderRadius:8,border:'none',
              background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              👤 Assign Incumbent
            </button>
          )}
          {node.status==='filled' && !node.succession && (
            <button style={{padding:'8px',borderRadius:8,border:'none',
              background:'#f59e0b',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              📋 Create Succession Plan
            </button>
          )}
          <button style={{padding:'8px',borderRadius:8,
            border:'1px solid #e2e8f0',background:'#fff',
            color:'#475569',fontSize:11,cursor:'pointer'}}>
            ✏️ Edit Position
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AI Assistant Panel ────────────────────────────────────────
function AIAssistantPanel({ onQuery, onClose }) {
  const [input,    setInput]    = useState('')
  const [messages, setMessages] = useState([
    {
      role:'ai',
      text:'Hi! I can help you navigate the org chart. Try asking:\n• "Show all high attrition risk positions"\n• "Who reports to the CTO?"\n• "Show vacant positions only"'
    }
  ])
  const [loading, setLoading] = useState(false)

  const send = (query) => {
    const q = query || input.trim()
    if (!q) return
    setMessages(prev => [...prev, {role:'user', text:q}])
    setInput('')
    setLoading(true)
    setTimeout(() => {
      const resp = AI_RESPONSES[q]
      const aiText = resp
        ? resp.message
        : `I analyzed your query: "${q}". Based on the org structure, let me suggest relevant filters. Try one of the preset queries for best results.`
      setMessages(prev => [...prev, {role:'ai', text:aiText}])
      if (resp) onQuery(resp)
      setLoading(false)
    }, 900)
  }

  return (
    <div style={{width:280,flexShrink:0,background:'#fff',
      border:'1px solid #e2e8f0',borderRadius:14,
      boxShadow:'0 4px 20px rgba(0,0,0,.1)',
      display:'flex',flexDirection:'column',
      position:'sticky',top:0,maxHeight:'80vh',
      overflow:'hidden'}}>

      {/* Header */}
      <div style={{padding:'12px 14px',background:'linear-gradient(135deg,#1e1b4b,#3730a3)',
        display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:18}}>🧠</span>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:'#fff'}}>AI Org Assistant</div>
            <div style={{fontSize:9,color:'#a5b4fc'}}>Ask in plain language</div>
          </div>
        </div>
        <button onClick={onClose}
          style={{background:'rgba(255,255,255,.15)',border:'none',
            borderRadius:6,width:24,height:24,cursor:'pointer',color:'#fff',fontSize:12}}>
          ✕
        </button>
      </div>

      {/* Suggestions */}
      <div style={{padding:'8px 10px',borderBottom:'1px solid #f1f5f9',
        flexShrink:0,background:'#f8fafc'}}>
        <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,marginBottom:5}}>
          Quick queries:
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          {AI_SUGGESTIONS.map((s,i) => (
            <button key={i} onClick={() => send(s)}
              style={{padding:'5px 8px',borderRadius:6,border:'1px solid #e2e8f0',
                background:'#fff',color:'#334155',fontSize:10,cursor:'pointer',
                textAlign:'left',transition:'all .1s'}}
              onMouseEnter={e=>e.target.style.background='#eff6ff'}
              onMouseLeave={e=>e.target.style.background='#fff'}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Chat messages */}
      <div style={{flex:1,overflowY:'auto',padding:'10px',display:'flex',
        flexDirection:'column',gap:8}}>
        {messages.map((msg,i) => (
          <div key={i} style={{
            alignSelf: msg.role==='user' ? 'flex-end' : 'flex-start',
            maxWidth:'90%',
          }}>
            <div style={{
              background: msg.role==='user' ? '#3b82f6' : '#f1f5f9',
              color:       msg.role==='user' ? '#fff' : '#334155',
              padding:'8px 10px',borderRadius:10,fontSize:11,lineHeight:1.5,
              whiteSpace:'pre-wrap',
              borderBottomRightRadius: msg.role==='user' ? 4 : 10,
              borderBottomLeftRadius:  msg.role==='ai'   ? 4 : 10,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{alignSelf:'flex-start',background:'#f1f5f9',
            padding:'8px 12px',borderRadius:10,fontSize:11,color:'#94a3b8'}}>
            🧠 Analyzing org structure...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{padding:'8px',borderTop:'1px solid #f1f5f9',flexShrink:0}}>
        <div style={{display:'flex',gap:6}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder="Ask about org structure..."
            style={{flex:1,padding:'7px 10px',borderRadius:8,
              border:'1px solid #e2e8f0',fontSize:11,outline:'none'}}/>
          <button onClick={()=>send()}
            style={{padding:'7px 10px',borderRadius:8,border:'none',
              background:'#3b82f6',color:'#fff',fontSize:12,cursor:'pointer',
              flexShrink:0}}>
            →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Org Chart Page ───────────────────────────────────────
export default function OrgChartPage() {
  const { persona } = useApp()

  const [selectedNode, setSelectedNode]   = useState(null)
  const [overlay,      setOverlay]        = useState('none')  // none|attrition|vacancy|span
  const [highlighted,  setHighlighted]    = useState([])      // ids to highlight
  const [deptFilter,   setDeptFilter]     = useState('all')
  const [showAI,       setShowAI]         = useState(true)
  const [showDetail,   setShowDetail]     = useState(false)
  const [expandedIds,  setExpandedIds]    = useState(
    new Set(ORG_NODES.map(n=>n.id))                           // all expanded by default
  )
  const [zoom, setZoom] = useState(100)

  // Stats
  const total    = ORG_NODES.length
  const filled   = ORG_NODES.filter(n=>n.status==='filled').length
  const vacant   = ORG_NODES.filter(n=>n.status==='vacant').length
  const highRisk = ORG_NODES.filter(n=>n.risk_score&&n.risk_score>60).length
  const noSucc   = ORG_NODES.filter(n=>n.status==='filled'&&!n.succession&&n.level<=2).length

  // Unique departments
  const depts = ['all', ...new Set(ORG_NODES.map(n=>n.dept))]

  // Filter nodes
  const visibleNodes = deptFilter==='all'
    ? ORG_NODES
    : ORG_NODES.filter(n=>n.dept===deptFilter||n.level<=1)

  // Build tree
  const buildTree = (parentId, nodes, depth=0) => {
    const children = nodes.filter(n => n.parent_id === parentId)
    if (children.length === 0) return null
    return children.map(node => {
      const grandchildren = buildTree(node.id, nodes, depth+1)
      const isVis = expandedIds.has(node.id)
      const isHigh = highlighted.includes(node.id)
      const isSel  = selectedNode?.id === node.id

      const handleSelect = (n) => {
        setSelectedNode(isSel ? null : n)
        setShowDetail(!isSel)
      }

      const toggle = (e) => {
        e.stopPropagation()
        setExpandedIds(prev => {
          const next = new Set(prev)
          if (next.has(node.id)) next.delete(node.id)
          else next.add(node.id)
          return next
        })
      }

      return (
        <div key={node.id} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          {/* Vertical connector from parent */}
          {depth > 0 && (
            <div style={{width:2,height:20,background:'#e2e8f0',flexShrink:0}}/>
          )}
          <OrgNode
            node={node}
            isHighlighted={isHigh}
            isSelected={isSel}
            overlay={overlay}
            onSelect={handleSelect}
          >
            {isVis && grandchildren ? grandchildren : []}
          </OrgNode>
          {/* Expand/collapse toggle */}
          {grandchildren && grandchildren.length > 0 && (
            <button onClick={toggle}
              style={{marginTop:4,padding:'2px 10px',borderRadius:10,
                border:'1px solid #e2e8f0',background:'#f8fafc',
                fontSize:10,color:'#64748b',cursor:'pointer',
                display:'flex',alignItems:'center',gap:3}}>
              {isVis ? '▲ Collapse' : `▼ Expand (${grandchildren.length})`}
            </button>
          )}
        </div>
      )
    })
  }

  const handleAIQuery = (resp) => {
    setHighlighted(resp.highlight || [])
    if (resp.filter === 'vacant') setOverlay('vacancy')
    if (resp.filter === 'high_risk') setOverlay('attrition')
    if (resp.filter === 'high_span') setOverlay('span')
  }

  const resetAll = () => {
    setHighlighted([])
    setOverlay('none')
    setSelectedNode(null)
    setShowDetail(false)
  }

  const rootNodes = buildTree(null, visibleNodes)

  return (
    <div>
      {/* Page Header */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <h2 style={{fontSize:22,fontWeight:900,color:'#0f172a',margin:0}}>
                Organization Chart
              </h2>
              <span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:11,fontWeight:700,
                padding:'3px 10px',borderRadius:20,border:'1px solid #bfdbfe'}}>
                AI-Driven · Real-Time
              </span>
            </div>
            <p style={{fontSize:12,color:'#94a3b8',margin:'4px 0 0'}}>
              Live org structure · Click any node for details · AI assistant on the right
            </p>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>setShowAI(!showAI)}
              style={{padding:'7px 14px',borderRadius:9,border:'1px solid #e2e8f0',
                background: showAI ? '#f5f3ff' : '#fff',
                color: showAI ? '#6d28d9' : '#475569',
                fontSize:11,fontWeight:700,cursor:'pointer'}}>
              🧠 {showAI ? 'Hide AI' : 'Show AI'}
            </button>
            <button onClick={resetAll}
              style={{padding:'7px 14px',borderRadius:9,border:'1px solid #e2e8f0',
                background:'#fff',color:'#475569',fontSize:11,cursor:'pointer'}}>
              ↺ Reset
            </button>
          </div>
        </div>
      </div>

      {/* KPI Bar */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:14}}>
        {[
          {icon:'📋',label:'Total Positions',value:total,       color:'#3b82f6'},
          {icon:'✅',label:'Filled',          value:filled,      color:'#10b981',sub:`${Math.round(filled*100/total)}% fill rate`},
          {icon:'○', label:'Vacant',          value:vacant,      color:'#f59e0b'},
          {icon:'⚠️',label:'High Attrition',  value:highRisk,    color:'#ef4444'},
          {icon:'📋',label:'No Succession',   value:noSucc,      color:'#8b5cf6'},
        ].map((s,i)=>(
          <div key={i} style={{background:'#fff',border:`1px solid #e2e8f0`,
            borderRadius:10,padding:'10px 14px',borderLeft:`3px solid ${s.color}`}}>
            <div style={{fontSize:18,marginBottom:2}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:'#0f172a'}}>{s.value}</div>
            <div style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>{s.label}</div>
            {s.sub && <div style={{fontSize:10,color:s.color,marginTop:2,fontWeight:600}}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,
        padding:'10px 14px',marginBottom:14,
        display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>

        {/* Overlay toggle */}
        <div style={{display:'flex',gap:5,alignItems:'center'}}>
          <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>Overlay:</span>
          {[
            {id:'none',     label:'None'    },
            {id:'attrition',label:'🧠 Risk' },
            {id:'vacancy',  label:'○ Vacancy'},
            {id:'span',     label:'Span'    },
          ].map(o=>(
            <button key={o.id} onClick={()=>setOverlay(o.id)}
              style={{padding:'4px 10px',borderRadius:8,fontSize:10,fontWeight:600,
                border:`1px solid ${overlay===o.id?'#3b82f6':'#e2e8f0'}`,
                background:overlay===o.id?'#eff6ff':'#fff',
                color:overlay===o.id?'#1d4ed8':'#64748b',cursor:'pointer'}}>
              {o.label}
            </button>
          ))}
        </div>

        <div style={{width:1,height:24,background:'#e2e8f0'}}/>

        {/* Dept filter */}
        <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>Dept:</span>
          {depts.slice(0,5).map(dept=>{
            const color = dept==='all'?'#3b82f6':
              DEPT_COLORS[dept]||'#64748b'
            return (
              <button key={dept} onClick={()=>setDeptFilter(dept)}
                style={{padding:'4px 10px',borderRadius:8,fontSize:10,fontWeight:600,
                  border:`1px solid ${deptFilter===dept?color:'#e2e8f0'}`,
                  background:deptFilter===dept?`${color}18`:'#fff',
                  color:deptFilter===dept?color:'#64748b',cursor:'pointer'}}>
                {dept==='all'?'All':dept.split(' ')[0]}
              </button>
            )
          })}
        </div>

        <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
          <span style={{fontSize:10,color:'#94a3b8'}}>Zoom:</span>
          <button onClick={()=>setZoom(z=>Math.max(60,z-10))}
            style={{width:24,height:24,borderRadius:6,border:'1px solid #e2e8f0',
              background:'#fff',cursor:'pointer',fontSize:14}}>−</button>
          <span style={{fontSize:11,color:'#334155',width:35,textAlign:'center'}}>
            {zoom}%
          </span>
          <button onClick={()=>setZoom(z=>Math.min(140,z+10))}
            style={{width:24,height:24,borderRadius:6,border:'1px solid #e2e8f0',
              background:'#fff',cursor:'pointer',fontSize:14}}>+</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:14,
        padding:'8px 14px',background:'#f8fafc',borderRadius:9,
        border:'1px solid #e2e8f0',fontSize:10,alignItems:'center'}}>
        <span style={{fontWeight:700,color:'#334155'}}>Legend:</span>
        {[
          {border:'#10b981',bg:'#fff', label:'Filled'},
          {border:'#f59e0b',bg:'#fffbeb',label:'Vacant'},
          {border:'#94a3b8',bg:'#f8fafc',label:'Frozen'},
          {border:'#7c3aed',bg:'#fff',label:'Highlighted by AI'},
        ].map((l,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:14,height:14,borderRadius:4,
              border:`2px solid ${l.border}`,background:l.bg}}/>
            <span style={{color:'#64748b'}}>{l.label}</span>
          </div>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <span style={{background:'#8b5cf6',color:'#fff',fontSize:8,fontWeight:800,
            padding:'1px 5px',borderRadius:6}}>MATRIX</span>
          <span style={{color:'#64748b'}}>Dotted-line</span>
        </div>
      </div>

      {/* Main: Org Chart + Panels */}
      <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>

        {/* Org Chart Canvas */}
        <div style={{flex:1,background:'#f8fafc',border:'1px solid #e2e8f0',
          borderRadius:14,padding:'24px',overflowX:'auto',overflowY:'auto',
          maxHeight:'65vh',minHeight:400,
          boxShadow:'inset 0 2px 8px rgba(0,0,0,.04)'}}>

          {/* Highlighted filter banner */}
          {highlighted.length > 0 && (
            <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',
              borderRadius:9,padding:'8px 12px',marginBottom:16,
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,color:'#6d28d9',fontWeight:700}}>
                🧠 AI highlighted {highlighted.length} node{highlighted.length>1?'s':''}
              </span>
              <button onClick={()=>setHighlighted([])}
                style={{fontSize:10,color:'#8b5cf6',background:'none',border:'none',cursor:'pointer'}}>
                Clear ✕
              </button>
            </div>
          )}

          {/* The actual org tree */}
          <div style={{
            transform:`scale(${zoom/100})`,
            transformOrigin:'top center',
            transition:'transform .2s',
            display:'flex',
            flexDirection:'column',
            alignItems:'center',
            gap:0,
          }}>
            {/* Root node: CEO */}
            {ORG_NODES.filter(n=>n.parent_id===null).map(root=>{
              const isSel  = selectedNode?.id === root.id

              const cLevel = ORG_NODES.filter(n=>n.parent_id===root.id)
              const l2Groups = []

              cLevel.forEach(c => {
                const subordinates = buildTree(c.id, visibleNodes, 1)
                l2Groups.push(
                  <div key={c.id} style={{display:'flex',flexDirection:'column',
                    alignItems:'center'}}>
                    <div style={{width:2,height:20,background:'#e2e8f0'}}/>
                    <OrgNode
                      node={c}
                      isHighlighted={highlighted.includes(c.id)}
                      isSelected={selectedNode?.id===c.id}
                      overlay={overlay}
                      onSelect={(n)=>{
                        setSelectedNode(selectedNode?.id===c.id?null:n)
                        setShowDetail(selectedNode?.id!==c.id)
                      }}
                    >
                      {expandedIds.has(c.id) ? subordinates : []}
                    </OrgNode>
                    {subordinates && subordinates.length > 0 && (
                      <button
                        onClick={()=>{
                          setExpandedIds(prev=>{
                            const next=new Set(prev)
                            if(next.has(c.id))next.delete(c.id)
                            else next.add(c.id)
                            return next
                          })
                        }}
                        style={{marginTop:4,padding:'2px 10px',borderRadius:10,
                          border:'1px solid #e2e8f0',background:'#fff',
                          fontSize:10,color:'#64748b',cursor:'pointer'}}>
                        {expandedIds.has(c.id)
                          ? '▲ Collapse'
                          : `▼ ${subordinates.length} reports`}
                      </button>
                    )}
                  </div>
                )
              })

              return (
                <div key={root.id} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <OrgNode
                    node={root}
                    isHighlighted={isHigh}
                    isSelected={isSel}
                    overlay={overlay}
                    onSelect={handleSelect}
                  />
                  {/* Horizontal bar connecting C-suite */}
                  <div style={{width:2,height:20,background:'#e2e8f0'}}/>
                  <div style={{position:'relative',display:'flex',gap:16,alignItems:'flex-start'}}>
                    {cLevel.length>1 && (
                      <div style={{
                        position:'absolute',top:0,
                        left:100,
                        width:`${(cLevel.length-1)*206}px`,
                        height:2,background:'#e2e8f0',
                      }}/>
                    )}
                    {l2Groups}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panels */}
        <div style={{display:'flex',flexDirection:'column',gap:12,flexShrink:0}}>
          {/* Node Detail */}
          {showDetail && selectedNode && (
            <NodeDetailPanel
              node={selectedNode}
              onClose={()=>{setShowDetail(false);setSelectedNode(null)}}
            />
          )}
          {/* AI Panel */}
          {showAI && (
            <AIAssistantPanel
              onQuery={handleAIQuery}
              onClose={()=>setShowAI(false)}
            />
          )}
        </div>
      </div>

      {/* Stats footer */}
      <div style={{marginTop:14,display:'grid',
        gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[
          {
            title:'Span of Control',
            items: ORG_NODES.filter(n=>n.direct_reports>0&&n.status==='filled')
              .map(n=>({
                name:n.incumbent,
                value:n.direct_reports,
                color:n.direct_reports>8?'#ef4444':n.direct_reports>5?'#f59e0b':'#10b981',
                label:n.direct_reports>8?'Overloaded':n.direct_reports>5?'Stretched':'Optimal'
              })),
          },
          {
            title:'Department Headcount',
            items: Object.entries(
              ORG_NODES.filter(n=>n.status==='filled').reduce((acc,n)=>{
                acc[n.dept]=(acc[n.dept]||0)+1; return acc
              },{})).map(([dept,count])=>({
                name:dept.split(' ')[0],
                value:count,
                color:DEPT_COLORS[dept]||'#64748b',
                label:`${count} filled`
              }))
          }
        ].map((section,si)=>(
          <div key={si}
            style={{background:'#fff',border:'1px solid #e2e8f0',
              borderRadius:10,padding:'12px 14px',
              gridColumn:`${si===0?'1/3':'3/5'}`}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>
              {section.title}
            </div>
            {section.items.slice(0,5).map((item,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',
                gap:8,marginBottom:6}}>
                <span style={{fontSize:11,color:'#64748b',
                  overflow:'hidden',textOverflow:'ellipsis',
                  whiteSpace:'nowrap',width:120,flexShrink:0}}>
                  {item.name}
                </span>
                <div style={{flex:1,height:6,background:'#f1f5f9',
                  borderRadius:6,overflow:'hidden'}}>
                  <div style={{width:`${Math.min(item.value*10,100)}%`,
                    height:'100%',background:item.color,borderRadius:6}}/>
                </div>
                <span style={{fontSize:10,fontWeight:700,
                  color:item.color,width:60,textAlign:'right',flexShrink:0}}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

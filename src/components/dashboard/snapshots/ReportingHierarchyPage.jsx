// FILE: ReportingHierarchyPage.jsx
// Page 3: Reporting Hierarchy - org tree, matrix/dotted line, span analysis, AI restructure

import { useState } from 'react'
import {
  Field, ContextMenu, ExcelModal, PageHeader,
  AIImpact, Drawer, SearchBar, Badge, LuxCard
} from './DeptSetupShared.jsx'

const T = {
  gradient: 'linear-gradient(135deg,#10b981 0%,#0ea5e9 100%)',
  accent:   '#10b981',
  light:    '#f0fdf4',
}

const MOCK_POSITIONS = [
  {id:'p1',  code:'POS-CEO',      title:'Chief Executive Officer',     grade:'E2', dept:'Executive',
   incumbent:'Rajesh Adhikari',   initials:'RA', color:'#0ea5e9',
   parent_id:null, dotted_to:null, type:'line',
   status:'filled', level:0, direct_reports:5, risk:'low', risk_score:8, succession:true,
   impact_links:[{icon:'🏛',module:'Board',desc:'Reports to Board of Directors'},{icon:'💰',module:'Executive Comp',desc:'Full P&L accountability'}],
  },
  {id:'p2',  code:'POS-CTO',      title:'Chief Technology Officer',    grade:'E1', dept:'IT',
   incumbent:'Bikram Shrestha',   initials:'BS', color:'#3b82f6',
   parent_id:'p1', dotted_to:null, type:'line',
   status:'filled', level:1, direct_reports:4, risk:'low', risk_score:12, succession:true,
   impact_links:[{icon:'💻',module:'Tech Strategy',desc:'Owns all tech decisions'},{icon:'👥',module:'IT Org',desc:'Manages 180+ engineers'}],
  },
  {id:'p3',  code:'POS-CFO',      title:'Chief Financial Officer',     grade:'E1', dept:'Finance',
   incumbent:'Meena Pradhan',     initials:'MP', color:'#10b981',
   parent_id:'p1', dotted_to:null, type:'line',
   status:'filled', level:1, direct_reports:3, risk:'low', risk_score:15, succession:false,
   impact_links:[{icon:'💰',module:'Finance',desc:'All payroll approvals'},{icon:'⚖',module:'Compliance',desc:'Financial compliance'}],
  },
  {id:'p4',  code:'POS-COO',      title:'Chief Operating Officer',     grade:'E1', dept:'Operations',
   incumbent:'Suresh Karki',      initials:'SK', color:'#ef4444',
   parent_id:'p1', dotted_to:null, type:'line',
   status:'filled', level:1, direct_reports:4, risk:'medium', risk_score:38, succession:false,
   impact_links:[{icon:'Settings',module:'Operations',desc:'All operational KPIs'},{icon:'📊',module:'SLA',desc:'Service delivery oversight'}],
  },
  {id:'p5',  code:'POS-HRD',      title:'HR Director',                 grade:'M3', dept:'HR',
   incumbent:'Sita Sharma',       initials:'SS', color:'#8b5cf6',
   parent_id:'p1', dotted_to:null, type:'line',
   status:'filled', level:1, direct_reports:5, risk:'low', risk_score:18, succession:true,
   impact_links:[{icon:'📋',module:'HR Policies',desc:'44 policies owner'},{icon:'👥',module:'Talent',desc:'All talent decisions'}],
  },
  {id:'p6',  code:'POS-CMO',      title:'Chief Marketing Officer',     grade:'E1', dept:'Marketing',
   incumbent:null,                initials:'?', color:'#f59e0b',
   parent_id:'p1', dotted_to:null, type:'line',
   status:'vacant', level:1, direct_reports:0, risk:'low', risk_score:null, succession:false,
   impact_links:[{icon:'📣',module:'Marketing',desc:'Brand & demand gen'},{icon:'💰',module:'Revenue',desc:'Pipeline contribution'}],
  },
  {id:'p7',  code:'POS-EM-FE',    title:'Engineering Manager (FE)',    grade:'M1', dept:'IT',
   incumbent:'Roshan Thapa',      initials:'RT', color:'#3b82f6',
   parent_id:'p2', dotted_to:null, type:'line',
   status:'filled', level:2, direct_reports:8, risk:'medium', risk_score:45, succession:false,
   impact_links:[{icon:'📅',module:'Leave',desc:'Approves FE team leave'},{icon:'🎯',module:'Sprints',desc:'FE sprint owner'}],
  },
  {id:'p8',  code:'POS-EM-BE',    title:'Engineering Manager (BE)',    grade:'M1', dept:'IT',
   incumbent:'Anita Karki',       initials:'AK', color:'#60a5fa',
   parent_id:'p2', dotted_to:null, type:'line',
   status:'filled', level:2, direct_reports:6, risk:'low', risk_score:22, succession:true,
   impact_links:[{icon:'📅',module:'Leave',desc:'Approves BE team leave'}],
  },
  {id:'p9',  code:'POS-HRBP-IT',  title:'HRBP - Technology',          grade:'M1', dept:'HR',
   incumbent:'Priya Rai',         initials:'PR', color:'#8b5cf6',
   parent_id:'p5', dotted_to:'p2', type:'dotted',
   status:'filled', level:2, direct_reports:0, risk:'high', risk_score:72, succession:false,
   impact_links:[{icon:'👥',module:'IT People',desc:'HR partner for IT dept'},{icon:'📋',module:'ER Cases',desc:'Handles IT employee relations'}],
  },
  {id:'p10', code:'POS-PM',       title:'Project Manager',             grade:'L4', dept:'Operations',
   incumbent:'Dev Poudel',        initials:'DP', color:'#ef4444',
   parent_id:'p4', dotted_to:'p2', type:'dotted',
   status:'filled', level:2, direct_reports:3, risk:'medium', risk_score:48, succession:false,
   impact_links:[{icon:'📋',module:'Projects',desc:'Cross-functional PM'},{icon:'Settings',module:'Delivery',desc:'Product delivery tracking'}],
  },
  {id:'p11', code:'POS-TL',       title:'Tech Lead',                   grade:'L4', dept:'IT',
   incumbent:'Ram Bista',         initials:'RB', color:'#93c5fd',
   parent_id:'p7', dotted_to:null, type:'line',
   status:'filled', level:3, direct_reports:0, risk:'medium', risk_score:55, succession:false,
   impact_links:[{icon:'💻',module:'Tech Direction',desc:'Frontend architecture'}],
  },
  {id:'p12', code:'POS-SE-V',     title:'Senior Engineer (Vacant)',    grade:'L3', dept:'IT',
   incumbent:null,                initials:'?', color:'#94a3b8',
   parent_id:'p8', dotted_to:null, type:'line',
   status:'vacant', level:3, direct_reports:0, risk:'low', risk_score:null, succession:false,
   impact_links:[{icon:'💻',module:'Backend Dev',desc:'Vacancy - hiring ongoing'}],
  },
]

const RISK_CFG = {
  low:    {color:'#10b981', bg:'#f0fdf4', label:'Low'},
  medium: {color:'#f59e0b', bg:'#fffbeb', label:'Medium'},
  high:   {color:'#ef4444', bg:'#fef2f2', label:'High'},
}

const CONTEXT_ACTIONS = [
  {icon:'👁',  label:'View Position',      key:'view'},
  {icon:'✏',  label:'Edit Position',      key:'edit'},
  {icon:'👤', label:'Change Incumbent',   key:'change'},
  {icon:'🔀', label:'Change Reporting To',key:'reroute'},
  {icon:'📋', label:'Add Dotted Line',    key:'dotted'},
  {icon:'🧠', label:'AI Risk Analysis',   key:'ai_risk'},
  {icon:'📊', label:'Succession Plan',    key:'succession'},
  {icon:'📤', label:'Export Subtree',     key:'export'},
  {icon:'🗑', label:'Remove Position',   key:'remove', danger:true},
]

// SVG Org Node
function OrgNode({ pos, highlighted, selected, onSelect, onCtx, overlay }) {
  const rc    = RISK_CFG[pos.risk] || RISK_CFG.low
  const isVac = pos.status === 'vacant'
  const isSel = selected === pos.id
  const isHi  = highlighted?.includes(pos.id)

  const borderColor = isSel ? '#1d4ed8' : isHi ? '#7c3aed' : isVac ? '#f59e0b' : '#e2e8f0'

  return (
    <div
      onClick={()=>onSelect(pos)}
      onContextMenu={e=>{e.preventDefault();onCtx(e,pos)}}
      style={{
        background: isVac ? '#fffbeb' : '#fff',
        border: `2px solid ${borderColor}`,
        borderRadius:12, padding:'10px 12px', width:180, cursor:'pointer',
        boxShadow: isSel ? `0 0 0 3px ${borderColor}30,0 4px 16px rgba(0,0,0,.1)` : '0 2px 8px rgba(0,0,0,.07)',
        transition:'all .18s cubic-bezier(.22,1,.36,1)',
        borderTop:`3px solid ${pos.color}`,
        transform: isSel||isHi ? 'scale(1.04)' : 'scale(1)',
      }}
      onMouseEnter={e=>{if(!isSel)e.currentTarget.style.transform='translateY(-2px) scale(1.02)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform=isSel?'scale(1.04)':'scale(1)'}}>

      {/* Dotted-line badge */}
      {pos.dotted_to && (
        <span style={{position:'absolute',top:-8,left:8,background:'#8b5cf6',color:'#fff',
          fontSize:8,fontWeight:800,padding:'1px 5px',borderRadius:8}}>MATRIX</span>
      )}
      {/* Vacant badge */}
      {isVac && (
        <span style={{position:'absolute',top:-8,right:8,background:'#f59e0b',color:'#fff',
          fontSize:8,fontWeight:800,padding:'1px 6px',borderRadius:8}}>VACANT</span>
      )}

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <div style={{width:32,height:32,borderRadius:9,flexShrink:0,
          background:isVac?'#f1f5f9':`${pos.color}22`,
          border:`2px solid ${isVac?'#e2e8f0':pos.color}`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:11,fontWeight:800,color:isVac?'#94a3b8':pos.color}}>
          {isVac?'?':pos.initials}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',
            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.3}}>
            {pos.incumbent||'Vacant'}
          </div>
          <div style={{fontSize:9,color:'#94a3b8'}}>{pos.grade}</div>
        </div>
      </div>
      <div style={{fontSize:10,fontWeight:700,color:'#334155',
        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:5,lineHeight:1.3}}>
        {pos.title}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{background:`${pos.color}18`,color:pos.color,fontSize:9,
          fontWeight:700,padding:'1px 6px',borderRadius:6}}>
          {pos.dept?.split(' ')[0]}
        </span>
        {/* Overlay: risk */}
        {overlay==='risk' && pos.risk_score && (
          <span style={{background:rc.bg,color:rc.color,fontSize:9,fontWeight:800,
            padding:'1px 6px',borderRadius:6}}>
            {pos.risk_score}%
          </span>
        )}
        {/* Overlay: span */}
        {overlay==='span' && pos.direct_reports > 0 && (
          <span style={{background:pos.direct_reports>8?'#fef2f2':'#f0fdf4',
            color:pos.direct_reports>8?'#ef4444':'#10b981',fontSize:9,fontWeight:800,
            padding:'1px 6px',borderRadius:6}}>
            {pos.direct_reports}
          </span>
        )}
      </div>
      {!pos.succession && pos.status==='filled' && pos.level<=2 && (
        <div style={{marginTop:4,fontSize:9,color:'#f59e0b',fontWeight:700}}>No succession</div>
      )}
    </div>
  )
}

// Simple recursive tree builder
function OrgBranch({ pos, allPositions, depth, highlighted, selected, onSelect, onCtx, overlay, expanded, onToggle }) {
  const children = allPositions.filter(p=>p.parent_id===pos.id)
  const isExpanded = expanded.has(pos.id)

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',position:'relative'}}>
      <OrgNode pos={pos} highlighted={highlighted} selected={selected}
        onSelect={onSelect} onCtx={onCtx} overlay={overlay} />

      {children.length > 0 && (
        <>
          <button onClick={()=>onToggle(pos.id)}
            style={{marginTop:4,padding:'2px 10px',borderRadius:10,border:'1px solid #e2e8f0',
              background:'#fff',fontSize:10,color:'#64748b',cursor:'pointer'}}>
            {isExpanded?'▲ Collapse':`▼ ${children.length} reports`}
          </button>
          {isExpanded && (
            <>
              <div style={{width:2,height:16,background:'#e2e8f0'}}/>
              <div style={{display:'flex',gap:12,alignItems:'flex-start',position:'relative'}}>
                {children.length>1 && (
                  <div style={{position:'absolute',top:0,left:'50%',right:'50%',height:2,background:'#e2e8f0',
                    width:`${(children.length-1)*192}px`,transform:'translateX(-50%)'}}/>
                )}
                {children.map(child=>(
                  <div key={child.id} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                    <div style={{width:2,height:16,background:'#e2e8f0'}}/>
                    <OrgBranch pos={child} allPositions={allPositions} depth={depth+1}
                      highlighted={highlighted} selected={selected}
                      onSelect={onSelect} onCtx={onCtx} overlay={overlay}
                      expanded={expanded} onToggle={onToggle}/>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default function ReportingHierarchyPage() {
  const [positions,  setPositions]  = useState(MOCK_POSITIONS)
  const [ctx,        setCtx]        = useState(null)
  const [selected,   setSelected]   = useState(null)
  const [showExcel,  setShowExcel]  = useState(false)
  const [showAdd,    setShowAdd]    = useState(false)
  const [overlay,    setOverlay]    = useState('none')
  const [highlighted,setHighlighted]= useState([])
  const [deptFilter, setDeptFilter] = useState('all')
  const [expanded,   setExpanded]   = useState(new Set(positions.map(p=>p.id)))

  const toggleExpand = (id) => setExpanded(prev=>{
    const next = new Set(prev)
    if(next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const depts   = ['all',...new Set(positions.map(p=>p.dept))]
  const roots   = positions.filter(p=>!p.parent_id)
  const visible = deptFilter==='all' ? positions
    : positions.filter(p=>p.dept===deptFilter||!p.parent_id)

  const filled = positions.filter(p=>p.status==='filled').length
  const vacant = positions.filter(p=>p.status==='vacant').length
  const highRisk = positions.filter(p=>p.risk_score&&p.risk_score>60)
  const matrixPos = positions.filter(p=>p.dotted_to)
  const overSpan  = positions.filter(p=>p.direct_reports>8)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="🗂" title="Reporting Hierarchy"
        breadcrumb="Organization Management > Structure & Hierarchy"
        gradient={T.gradient}
        stats={[
          {icon:'📋',label:'Total Positions', value:positions.length},
          {icon:'✅',label:'Filled',          value:filled+' ('+Math.round(filled/positions.length*100)+'%)'},
          {icon:'○', label:'Vacant',          value:vacant},
          {icon:'🔀',label:'Matrix Reports',  value:matrixPos.length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Position"
        onExcel={()=>setShowExcel(true)}
      />

      {/* KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[
          {icon:'⚠',label:'High Attrition Risk', value:highRisk.length+' positions', color:'#ef4444',
           sub:highRisk.map(p=>p.incumbent||p.title).slice(0,2).join(', ')},
          {icon:'🔀',label:'Matrix Relationships', value:matrixPos.length, color:'#8b5cf6',
           sub:'Dotted-line reporting'},
          {icon:'📊',label:'Span > 8 Direct Reports',value:overSpan.length, color:'#f59e0b',
           sub:overSpan.map(p=>p.incumbent||p.title).join(', ') || 'None'},
          {icon:'📋',label:'No Succession Plan',  value:positions.filter(p=>!p.succession&&p.status==='filled'&&p.level<=2).length,color:'#6366f1',
           sub:'Senior positions at risk'},
        ].map((k,i)=>(
          <div key={i} style={{background:'#fff',border:`1px solid ${k.color}25`,borderRadius:12,
            padding:'12px 14px',borderLeft:`3px solid ${k.color}`}}>
            <div style={{fontSize:20,marginBottom:3}}>{k.icon}</div>
            <div style={{fontSize:18,fontWeight:900,color:k.color}}>{k.value}</div>
            <div style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>{k.label}</div>
            {k.sub&&<div style={{fontSize:9,color:'#64748b',marginTop:2}}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,
        padding:'10px 14px',marginBottom:14,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        {/* Overlay */}
        <div style={{display:'flex',gap:5,alignItems:'center'}}>
          <span style={{fontSize:11,fontWeight:700,color:'#334155'}}>Overlay:</span>
          {[{id:'none',l:'Clean'},{id:'risk',l:'Attrition Risk'},{id:'span',l:'Span of Control'},{id:'vacancy',l:'Vacancy'}].map(o=>(
            <button key={o.id} onClick={()=>setOverlay(o.id)}
              style={{padding:'5px 12px',borderRadius:8,border:`1.5px solid ${overlay===o.id?T.accent:'#e2e8f0'}`,
                background:overlay===o.id?T.light:'#fff',color:overlay===o.id?T.accent:'#64748b',
                fontSize:11,fontWeight:600,cursor:'pointer'}}>
              {o.l}
            </button>
          ))}
        </div>
        <div style={{width:1,height:24,background:'#e2e8f0'}}/>
        {/* Dept filter */}
        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
          style={{padding:'8px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:11,background:'#fff',cursor:'pointer',outline:'none'}}>
          {depts.map(d=><option key={d} value={d}>{d==='all'?'All Departments':d}</option>)}
        </select>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          <button onClick={()=>setExpanded(new Set(positions.map(p=>p.id)))}
            style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer',color:'#64748b'}}>
            Expand All
          </button>
          <button onClick={()=>setExpanded(new Set())}
            style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer',color:'#64748b'}}>
            Collapse All
          </button>
        </div>
      </div>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,
        padding:'8px 14px',marginBottom:14,fontSize:11,color:'#166534'}}>
        Right-click any position node for SAP-style impact analysis, restructure options, and succession planning
      </div>

      {/* Org Chart Canvas */}
      <div style={{background:'linear-gradient(180deg,#f8fafc 0%,#fff 100%)',
        border:'1px solid #e2e8f0',borderRadius:16,overflow:'auto',
        padding:'30px 20px',maxHeight:'65vh',boxShadow:'inset 0 2px 8px rgba(0,0,0,.04)'}}>
        {/* High-risk banner */}
        {overlay==='risk' && highRisk.length > 0 && (
          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,
            padding:'8px 14px',marginBottom:16,fontSize:11,color:'#dc2626',fontWeight:600}}>
            🧠 AI Attrition Risk: {highRisk.map(p=>`${p.incumbent} (${p.risk_score}%)`).join(', ')} - immediate action recommended
          </div>
        )}

        {/* Dotted-line legend */}
        {matrixPos.length > 0 && (
          <div style={{display:'flex',gap:16,marginBottom:16,fontSize:10,color:'#64748b',justifyContent:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:20,height:2,background:'#334155'}}/>
              <span>Line reporting</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{background:'#8b5cf6',color:'#fff',fontSize:8,fontWeight:800,
                padding:'1px 5px',borderRadius:6}}>MATRIX</span>
              <span>Dotted-line / matrix reporting</span>
            </div>
          </div>
        )}

        {/* Render tree */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0}}>
          {roots.map(root=>(
            <OrgBranch key={root.id} pos={root} allPositions={visible}
              depth={0} highlighted={highlighted} selected={selected?.id}
              onSelect={pos=>{setSelected(prev=>prev?.id===pos.id?null:pos)}}
              onCtx={(e,pos)=>setCtx({x:e.clientX,y:e.clientY,item:pos})}
              overlay={overlay} expanded={expanded} onToggle={toggleExpand}/>
          ))}
        </div>
      </div>

      {/* Bottom stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:14}}>
        {/* Span of control */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 16px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>
            Span of Control Analysis (Global Best Practice: 5-8)
          </div>
          {positions.filter(p=>p.direct_reports>0&&p.status==='filled').map((p,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',
              borderBottom:'1px solid #f8fafc',fontSize:11}}>
              <span style={{width:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                color:'#334155',fontWeight:600}}>{p.incumbent}</span>
              <div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}>
                <div style={{width:`${Math.min(p.direct_reports/20*100,100)}%`,height:'100%',borderRadius:6,
                  background:p.direct_reports>8?'#ef4444':p.direct_reports>=5?'#10b981':'#f59e0b'}}/>
              </div>
              <span style={{width:20,fontWeight:700,textAlign:'right',
                color:p.direct_reports>8?'#ef4444':p.direct_reports>=5?'#10b981':'#f59e0b'}}>
                {p.direct_reports}
              </span>
              <span style={{fontSize:9,width:60,color:'#94a3b8'}}>
                {p.direct_reports>8?'Overloaded':p.direct_reports>=5?'Optimal':'Low'}
              </span>
            </div>
          ))}
        </div>
        {/* AI restructure suggestions */}
        <div style={{background:'linear-gradient(135deg,#f5f3ff,#ecfdf5)',
          border:'1px solid #c4b5fd',borderRadius:12,padding:'14px 16px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#1e1b4b',marginBottom:10}}>
            🧠 AI Restructure Recommendations
          </div>
          {[
            {issue:'High span: Roshan Thapa has 8 direct reports', rec:'Promote Ram Bista (Tech Lead) to Engineering Manager to reduce load', urgency:'medium'},
            {issue:'No succession: CTO, COO, CFO have no designated successors', rec:'Identify and develop 2 succession candidates per senior role', urgency:'high'},
            {issue:'Critical flight risk: Priya Rai (HRBP) at 72% attrition risk', rec:'Initiate retention conversation and succession planning immediately', urgency:'high'},
            {issue:'CMO role vacant for 47+ days', rec:'3 internal candidates identified by AI. Recommend external search', urgency:'medium'},
          ].map((r,i)=>(
            <div key={i} style={{padding:'8px 0',borderBottom:'1px solid rgba(124,58,237,.1)',fontSize:11}}>
              <div style={{color:r.urgency==='high'?'#dc2626':'#b45309',fontWeight:700,marginBottom:3}}>
                {r.urgency==='high'?'🔴':'🟡'} {r.issue}
              </div>
              <div style={{color:'#4c1d95',lineHeight:1.5}}>{r.rec}</div>
            </div>
          ))}
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
        impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
        actions={CONTEXT_ACTIONS}
        onAction={(k,item)=>{
          if(k==='view') setSelected(item)
          if(k==='ai_risk') alert('AI risk analysis: '+item.title+' - '+item.risk_score+'% attrition risk. '+item.incumbent)
        }}
        onClose={()=>setCtx(null)} />}

      {showExcel && <ExcelModal title="Reporting Hierarchy"
        columns={['Position Code','Job Title','Grade','Department','Incumbent Name','Reports To (Code)','Dotted Line To (Code)','Status']}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Processing: '+f.name)} />}

      {showAdd && <AddPositionModal onClose={()=>setShowAdd(false)}
        positions={positions}
        onSave={p=>setPositions(prev=>[...prev,{...p,id:'p'+Date.now(),status:'vacant',level:2,direct_reports:0,risk:'low',risk_score:null,succession:false,impact_links:[]}])} />}

      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Position Code',   selected?.code],
          ['Grade',           selected?.grade],
          ['Department',      selected?.dept],
          ['Incumbent',       selected?.incumbent||'VACANT'],
          ['Status',          selected?.status],
          ['Level',           selected ? 'Level '+selected.level : null],
          ['Direct Reports',  selected?.direct_reports],
          ['Reports To',      selected ? positions.find(p=>p.id===selected.parent_id)?.title||'CEO (Top)' : null],
          ['Dotted Line To',  selected?.dotted_to ? positions.find(p=>p.id===selected.dotted_to)?.title : 'None'],
          ['Attrition Risk',  selected?.risk_score ? `${selected.risk_score}% (${selected.risk})` : 'N/A - Vacant'],
          ['Succession Plan', selected?.succession ? 'Yes' : 'No - Action needed'],
        ]}/>
    </div>
  )
}

function AddPositionModal({ onClose, onSave, positions }) {
  const [f,setF] = useState({code:'',title:'',grade:'L3',dept:'',incumbent:'',parent_id:'',dotted_to:'',type:'line'})
  const s = k => v => setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:660,maxHeight:'90vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 28px',background:T.gradient,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ Add Position to Hierarchy</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Position Code" value={f.code} onChange={s('code')} required accent={T.accent} hint="e.g. POS-IT-SE-003"/>
            <Field label="Job Title" value={f.title} onChange={s('title')} required accent={T.accent}/>
            <Field label="Grade Level" type="select" value={f.grade} onChange={s('grade')} accent={T.accent}
              options={['L1','L2','L3','L4','L5','M1','M2','M3','E1','E2']} required/>
            <Field label="Department" type="select" value={f.dept} onChange={s('dept')} accent={T.accent}
              options={['IT','HR','Finance','Sales','Marketing','Operations','Legal','Executive']}/>
            <Field label="Reports To (Line Manager)" type="select" value={f.parent_id} onChange={s('parent_id')} accent={T.accent}
              options={positions.filter(p=>p.status==='filled').map(p=>({value:p.id,label:p.incumbent+' - '+p.title}))} required/>
            <Field label="Dotted Line To (Matrix)" type="select" value={f.dotted_to} onChange={s('dotted_to')} accent={T.accent}
              options={[{value:'',label:'None - Line reporting only'},...positions.filter(p=>p.status==='filled').map(p=>({value:p.id,label:p.incumbent+' - '+p.title}))]}
              hint="Optional - for matrix/cross-functional reporting"/>
            <Field label="Incumbent Name" value={f.incumbent} onChange={s('incumbent')} accent={T.accent} hint="Leave blank if position is vacant"/>
          </div>
          <AIImpact color={T.accent} lines={[
            'New position inherits reporting rules, approval workflows, and leave policies from line manager.',
            'Dotted-line relationship creates matrix reporting visible in org chart.',
            'If incumbent is assigned, AI will auto-assess attrition risk within 48 hours.',
            'Position-based hierarchy: when incumbent leaves, position remains with full configuration.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}}
              style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:T.gradient,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Add Position
            </button>
            <button onClick={onClose}
              style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

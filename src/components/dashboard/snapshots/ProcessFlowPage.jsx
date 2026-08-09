// FILE: src/components/dashboard/snapshots/ProcessFlowPage.jsx
// Two-level nav: Department -> Tasks grid -> Individual task flowchart
// Edit mode per node | AI auto-generation for new depts + tasks
// All flows stored in localStorage for persistence

import { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

// ── DATA ──────────────────────────────────────────────────────
const VK = (typeof window !== 'undefined' && window.__VITE_API_KEY__) || ''

const DEPT_LIST = [
  { id:'hr',    name:'Human Resources',           icon:'👥', color:'#8b5cf6', group:'HR',
    tasks:[{id:'hr_recruit',icon:'🔍',label:'Recruiting & Talent Acquisition'},{id:'hr_onboard',icon:'🎓',label:'Onboarding & Training'},{id:'hr_comp',icon:'💰',label:'Compensation & Benefits'},{id:'hr_perf',icon:'📊',label:'Performance Management'},{id:'hr_comply',icon:'⚖️',label:'HR Compliance Management'}]},
  { id:'exec',  name:'Executive & Administration',icon:'🎯', color:'#0ea5e9', group:'Executive',
    tasks:[{id:'ex_strategy',icon:'🚀',label:'Corporate Strategy Development'},{id:'ex_legal',icon:'⚖️',label:'Legal & Regulatory Compliance'},{id:'ex_board',icon:'🏛',label:'Board of Directors Relations'},{id:'ex_pr',icon:'📢',label:'Public Relations'},{id:'ex_coord',icon:'🔗',label:'Cross-Dept Coordination'}]},
  { id:'mkt',   name:'Marketing',                 icon:'📣', color:'#f97316', group:'Marketing',
    tasks:[{id:'mk_research',icon:'🔬',label:'Market Research'},{id:'mk_brand',icon:'🎨',label:'Brand Management'},{id:'mk_digital',icon:'💻',label:'Digital Marketing (SEO/Social)'},{id:'mk_pr',icon:'📰',label:'Public Relations (PR)'},{id:'mk_leads',icon:'📈',label:'Lead Generation Campaigns'},{id:'mk_position',icon:'🎯',label:'Product Positioning'}]},
  { id:'sales', name:'Sales',                     icon:'💼', color:'#ea580c', group:'Revenue',
    tasks:[{id:'sl_nurture',icon:'🌱',label:'Lead Nurturing'},{id:'sl_account',icon:'🤝',label:'Account Management'},{id:'sl_contract',icon:'📝',label:'Contract Negotiation'},{id:'sl_crm',icon:'🗃️',label:'CRM Management'},{id:'sl_field',icon:'🏃',label:'Direct Field Sales'},{id:'sl_quota',icon:'🎯',label:'Revenue Quota Achievement'}]},
  { id:'ops',   name:'Operations & Production',   icon:'🔧', color:'#b45309', group:'Operations',
    tasks:[{id:'op_supply',icon:'🔗',label:'Supply Chain Management'},{id:'op_mfg',icon:'🏭',label:'Manufacturing & Assembly'},{id:'op_logistics',icon:'🚚',label:'Logistics & Distribution'},{id:'op_quality',icon:'✅',label:'Quality Control'},{id:'op_facility',icon:'🏢',label:'Daily Facility Management'}]},
  { id:'fin',   name:'Finance & Accounting',      icon:'💰', color:'#10b981', group:'Finance',
    tasks:[{id:'fi_book',icon:'📒',label:'Bookkeeping'},{id:'fi_payroll',icon:'🧾',label:'Payroll Processing'},{id:'fi_fpa',icon:'📊',label:'Financial Planning & Analysis'},{id:'fi_tax',icon:'📋',label:'Tax Compliance'},{id:'fi_audit',icon:'🔍',label:'Auditing'},{id:'fi_capital',icon:'🏦',label:'Securing Capital & Funding'}]},
  { id:'it',    name:'Information Technology',    icon:'💻', color:'#3b82f6', group:'Technology',
    tasks:[{id:'it_network',icon:'🌐',label:'Network Infrastructure'},{id:'it_cyber',icon:'🔐',label:'Cybersecurity'},{id:'it_helpdesk',icon:'🎧',label:'Software/Hardware Support'},{id:'it_dba',icon:'🗄️',label:'Database Administration'},{id:'it_digital',icon:'🚀',label:'Digital Transformation'}]},
  { id:'cs',    name:'Customer Service',          icon:'🎧', color:'#06b6d4', group:'Operations',
    tasks:[{id:'cs_support',icon:'📞',label:'Omnichannel Support'},{id:'cs_ticket',icon:'🎫',label:'Ticket Resolution'},{id:'cs_tech',icon:'🔧',label:'Technical Troubleshooting'},{id:'cs_returns',icon:'↩️',label:'Processing Returns & Refunds'},{id:'cs_feedback',icon:'⭐',label:'Customer Feedback Collection'}]},
  { id:'legal', name:'Legal & Compliance',        icon:'⚖️', color:'#ef4444', group:'Compliance',
    tasks:[{id:'lg_contract',icon:'📝',label:'Contract Drafting & Review'},{id:'lg_comply',icon:'⚖️',label:'Regulatory Compliance'},{id:'lg_dispute',icon:'⚔️',label:'Dispute Resolution'},{id:'lg_ip',icon:'💡',label:'Intellectual Property Management'}]},
  { id:'pmo',   name:'Project Management Office', icon:'📋', color:'#0369a1', group:'Strategy',
    tasks:[{id:'pm_initiate',icon:'🚀',label:'Project Initiation & Charter'},{id:'pm_plan',icon:'📅',label:'Project Planning & Scheduling'},{id:'pm_execute',icon:'▶️',label:'Project Execution & Monitoring'},{id:'pm_close',icon:'✅',label:'Project Closure & Lessons'}]},
  { id:'rnd',   name:'Research & Development',    icon:'🔬', color:'#0891b2', group:'Innovation',
    tasks:[{id:'rd_ideate',icon:'💡',label:'Ideation & Concept Development'},{id:'rd_research',icon:'🔭',label:'Research & Feasibility Study'},{id:'rd_prototype',icon:'🧪',label:'Prototype & Testing'},{id:'rd_patent',icon:'📜',label:'IP Filing & Commercialisation'}]},
  { id:'risk',  name:'Risk Management',           icon:'🛡️', color:'#dc2626', group:'Compliance',
    tasks:[{id:'rk_identify',icon:'🔍',label:'Risk Identification & Register'},{id:'rk_assess',icon:'📊',label:'Risk Assessment & Scoring'},{id:'rk_mitigate',icon:'🛡️',label:'Risk Mitigation & Controls'},{id:'rk_monitor',icon:'👁️',label:'Continuous Risk Monitoring'}]},
]

// ── AI GENERATION ─────────────────────────────────────────────
async function callAI(prompt, system, json=false) {
  const body = { model:'claude-sonnet-4-6', max_tokens:4000, system, messages:[{role:'user',content:prompt}] }
  try {
    const r = await fetch('/api/v1/ai-proxy/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)})
    if (r.ok) { const d=await r.json(); const t=d.content?.map?.(c=>c.text||'').join('')||''; return json?JSON.parse(t.replace(/```json|```/g,'').trim()):t }
  } catch {}
  if (VK && VK.startsWith('sk-ant')) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':VK,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},body:JSON.stringify(body)})
      const d = await r.json()
      const t = d?.content?.[0]?.text||''
      return json?JSON.parse(t.replace(/```json|```/g,'').trim()):t
    } catch {}
  }
  return json?null:'AI generation unavailable. Please add your Anthropic API key.'
}

async function generateDeptFlow(dept) {
  const sys = `You are a business process expert. Return ONLY valid JSON, no markdown, no preamble.`
  const prompt = `Create a professional swimlane process flow for "${dept.name}" department task "${dept.taskLabel}".

Return JSON with this exact structure:
{
  "title": "string",
  "subtitle": "string (showing main flow steps separated by ->)",
  "swimlanes": ["lane1","lane2","lane3","lane4"],
  "height": number (600-1000),
  "nodes": [
    {"id":"n0","type":"start","x":270,"y":30,"w":180,"h":34,"label":"string","lane":0},
    {"id":"n1","type":"process","x":220,"y":90,"w":200,"h":44,"label":"string","sub":"string","lane":1},
    ...more nodes...
    {"id":"nE","type":"end","x":270,"y":HEIGHT-40,"w":180,"h":34,"label":"string","lane":0}
  ],
  "edges": [
    {"from":"n0","to":"n1"},
    {"from":"n1","to":"n2"},
    ...
  ]
}

Node types: "start", "end", "process", "decision" (h:56), "io", "document", "ai"
- Start at y:30, each subsequent node y += 70-80
- decisions: w:188, h:56
- Include 2-3 "ai" type nodes for AI-powered steps
- Include 2-3 "decision" nodes with Yes/No paths
- 10-16 nodes total including start/end
- For decision "No" paths: add side node at x:60 with same y, edge label "No" side "left"
- Lane 0-3 matching swimlanes array index
- All x values between 50-480, y values positive
- Make it professional, realistic, and specific to "${dept.name}" - "${dept.taskLabel}"

Return ONLY the JSON object.`

  return await callAI(prompt, sys, true)
}

async function generateDeptAndTasks(deptName, deptDesc) {
  const sys = `You are a business process expert. Return ONLY valid JSON.`
  const prompt = `Create department structure and list of tasks for a new department: "${deptName}".
Description: ${deptDesc || 'Standard business department'}

Return JSON:
{
  "icon": "single emoji",
  "color": "#hexcolor",
  "group": "one of: HR, Executive, Marketing, Revenue, Operations, Finance, Technology, Compliance, Strategy, Innovation, Product",
  "tasks": [
    {"id": "dept_taskname", "icon": "emoji", "label": "Task Name"},
    ...5-8 tasks...
  ]
}

Return ONLY the JSON.`
  return await callAI(prompt, sys, true)
}

// ── SVG ENGINE ────────────────────────────────────────────────
function getC(n){return{cx:n.x+n.w/2,cy:n.y+n.h/2}}
function getPort(n,side){const{cx,cy}=getC(n);if(side==='top')return{x:cx,y:n.y};if(side==='bottom')return{x:cx,y:n.y+n.h};if(side==='left')return{x:n.x,y:cy};if(side==='right')return{x:n.x+n.w,y:cy};return{x:cx,y:cy}}

function SvgNode({n,color,sel,onSel,editMode,onEdit}){
  const{cx,cy}=getC(n);const hl=sel===n.id;const lY=n.sub?n.y+15:cy,sY=n.y+30
  const glow=hl?`drop-shadow(0 0 6px ${color}88)`:'none'
  const click=()=>{if(editMode)onEdit(n);else onSel(n.id===sel?null:n.id)}
  const editBadge=editMode&&<rect x={n.x+n.w-16} y={n.y-6} width={14} height={14} rx={3} fill="#f59e0b" onClick={e=>{e.stopPropagation();onEdit(n)}} style={{cursor:'pointer'}}/>
  if(n.type==='start'||n.type==='end')return(<g style={{cursor:'pointer',filter:glow}} onClick={click}><ellipse cx={cx} cy={cy} rx={n.w/2} ry={n.h/2} fill={hl?color:'#1e293b'} stroke={color} strokeWidth={hl?2:1}/><text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{fontSize:11,fontWeight:700,fill:'#fff'}}>{n.label}</text>{editBadge}</g>)
  if(n.type==='decision'){const pts=`${cx},${n.y} ${n.x+n.w},${cy} ${cx},${n.y+n.h} ${n.x},${cy}`;return(<g style={{cursor:'pointer',filter:glow}} onClick={click}><polygon points={pts} fill={hl?'#fef9c3':'#fffbeb'} stroke="#f59e0b" strokeWidth={hl?2:1}/><text x={cx} y={n.sub?cy-7:cy} textAnchor="middle" dominantBaseline="central" style={{fontSize:10,fontWeight:600,fill:'#78350f'}}>{n.label}</text>{n.sub&&<text x={cx} y={cy+8} textAnchor="middle" style={{fontSize:9,fill:'#92400e'}}>{n.sub}</text>}{editBadge}</g>)}
  if(n.type==='io'){const sk=14,pts=`${n.x+sk},${n.y} ${n.x+n.w},${n.y} ${n.x+n.w-sk},${n.y+n.h} ${n.x},${n.y+n.h}`;return(<g style={{cursor:'pointer',filter:glow}} onClick={click}><polygon points={pts} fill={hl?'#dbeafe':'#eff6ff'} stroke="#60a5fa" strokeWidth={hl?2:1}/><text x={cx} y={n.sub?lY:cy} textAnchor="middle" dominantBaseline="central" style={{fontSize:10,fontWeight:600,fill:'#1e40af'}}>{n.label}</text>{n.sub&&<text x={cx} y={sY} textAnchor="middle" style={{fontSize:9,fill:'#3b82f6'}}>{n.sub}</text>}{editBadge}</g>)}
  if(n.type==='document'){const wH=7,p=`M${n.x},${n.y} L${n.x+n.w},${n.y} L${n.x+n.w},${n.y+n.h-wH} Q${n.x+n.w*.75},${n.y+n.h+wH} ${n.x+n.w/2},${n.y+n.h-wH} Q${n.x+n.w*.25},${n.y+n.h-wH*2.5} ${n.x},${n.y+n.h-wH} Z`;return(<g style={{cursor:'pointer',filter:glow}} onClick={click}><path d={p} fill={hl?'#fce7f3':'#fdf4ff'} stroke="#c084fc" strokeWidth={hl?2:1}/><text x={cx} y={n.sub?lY:cy-3} textAnchor="middle" dominantBaseline="central" style={{fontSize:10,fontWeight:600,fill:'#6b21a8'}}>{n.label}</text>{n.sub&&<text x={cx} y={sY-3} textAnchor="middle" style={{fontSize:9,fill:'#7e22ce'}}>{n.sub}</text>}{editBadge}</g>)}
  if(n.type==='ai')return(<g style={{cursor:'pointer',filter:glow}} onClick={click}><rect x={n.x} y={n.y} width={n.w} height={n.h} rx={6} fill={hl?'#ede9fe':'#f5f3ff'} stroke="#8b5cf6" strokeWidth={hl?2:1} strokeDasharray="4 2"/><rect x={n.x+n.w-28} y={n.y-7} width={24} height={14} rx={7} fill="#8b5cf6"/><text x={n.x+n.w-16} y={n.y} textAnchor="middle" dominantBaseline="central" style={{fontSize:8,fontWeight:700,fill:'#fff'}}>AI</text><text x={cx} y={n.sub?lY:cy} textAnchor="middle" dominantBaseline="central" style={{fontSize:10,fontWeight:600,fill:'#4c1d95'}}>{n.label}</text>{n.sub&&<text x={cx} y={sY} textAnchor="middle" style={{fontSize:9,fill:'#6d28d9'}}>{n.sub}</text>}{editBadge}</g>)
  return(<g style={{cursor:'pointer',filter:glow}} onClick={click}><rect x={n.x} y={n.y} width={n.w} height={n.h} rx={5} fill={hl?'#dbeafe':'#f8fafc'} stroke={hl?color:'#cbd5e1'} strokeWidth={hl?2:1}/><text x={cx} y={n.sub?lY:cy} textAnchor="middle" dominantBaseline="central" style={{fontSize:10,fontWeight:600,fill:hl?'#1e40af':'#1e293b'}}>{n.label}</text>{n.sub&&<text x={cx} y={sY} textAnchor="middle" style={{fontSize:9,fill:'#64748b'}}>{n.sub}</text>}{editBadge}</g>)
}

function SvgEdge({e,nodeMap,color}){
  const fn=nodeMap[e.from],tn=nodeMap[e.to];if(!fn||!tn)return null
  const f=getPort(fn,e.fromSide||'bottom'),t=getPort(tn,e.toSide||'top')
  let d
  if(e.bend&&e.bx&&e.by)d=`M${f.x},${f.y} L${f.x},${e.by} L${e.bx},${e.by} L${e.bx},${t.y} L${t.x},${t.y}`
  else if(e.bend&&e.by)d=`M${f.x},${f.y} L${f.x},${e.by} L${t.x},${e.by} L${t.x},${t.y}`
  else d=`M${f.x},${f.y} L${t.x},${t.y}`
  const mx=(f.x+t.x)/2,my=(f.y+t.y)/2
  return(<g><path d={d} fill="none" stroke={color} strokeWidth={1.5} opacity={0.65} markerEnd="url(#pfah)"/>{e.label&&<text x={mx+5} y={my-3} textAnchor="middle" style={{fontSize:9,fontWeight:700,fill:color}}>{e.label}</text>}</g>)
}

function FlowChart({flow,color,selNode,onSelNode,editMode,onEditNode}){
  const nm={};flow.nodes.forEach(n=>{nm[n.id]=n})
  const lC=flow.swimlanes?.length||1,lH=Math.ceil(flow.height/lC)
  const lC2=['#f0f9ff','#f0fdf4','#faf5ff','#fff7ed','#fff1f2','#f8faff']
  return(
    <svg width="100%" viewBox={`0 0 680 ${flow.height+50}`} role="img" style={{minWidth:500}}>
      <title>{flow.title}</title>
      <defs><marker id="pfah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
      {flow.swimlanes&&flow.swimlanes.map((lane,li)=>(
        <g key={li}>
          <rect x={0} y={li*lH+30} width={680} height={lH} fill={lC2[li%lC2.length]} stroke="#e2e8f0" strokeWidth={0.5}/>
          <rect x={0} y={li*lH+30} width={28} height={lH} fill={color+'22'} stroke={color} strokeWidth={0.5}/>
          <text x={14} y={li*lH+30+lH/2} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90,14,${li*lH+30+lH/2})`} style={{fontSize:9,fontWeight:600,fill:color,letterSpacing:'0.04em'}}>{lane}</text>
        </g>
      ))}
      <text x={340} y={18} textAnchor="middle" style={{fontSize:12,fontWeight:700,fill:'#0f172a'}}>{flow.title}</text>
      {flow.edges.map((e,i)=><SvgEdge key={i} e={e} nodeMap={nm} color={color}/>)}
      {flow.nodes.map(n=><SvgNode key={n.id} n={n} color={color} sel={selNode} onSel={onSelNode} editMode={editMode} onEdit={onEditNode}/>)}
    </svg>
  )
}

function Legend(){
  const items=[{s:'oval',fill:'#1e293b',stroke:'#3b82f6',label:'Start/End'},{s:'rect',fill:'#f8fafc',stroke:'#94a3b8',label:'Process'},{s:'diamond',fill:'#fffbeb',stroke:'#f59e0b',label:'Decision'},{s:'para',fill:'#eff6ff',stroke:'#60a5fa',label:'I/O'},{s:'doc',fill:'#fdf4ff',stroke:'#c084fc',label:'Document'},{s:'dash',fill:'#f5f3ff',stroke:'#8b5cf6',label:'AI Step'}]
  return(<div style={{display:'flex',flexWrap:'wrap',gap:8,padding:'7px 12px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:9,marginBottom:10}}>
    <span style={{fontSize:10,fontWeight:700,color:'#334155'}}>Symbols:</span>
    {items.map(s=>(
      <span key={s.label} style={{display:'flex',alignItems:'center',gap:4}}>
        <svg width={22} height={14} viewBox="0 0 22 14">
          {s.s==='oval'&&<ellipse cx={11} cy={7} rx={10} ry={6} fill={s.fill} stroke={s.stroke} strokeWidth={1.5}/>}
          {s.s==='rect'&&<rect x={1} y={1} width={20} height={12} rx={3} fill={s.fill} stroke={s.stroke} strokeWidth={1.5}/>}
          {s.s==='diamond'&&<polygon points="11,0 22,7 11,14 0,7" fill={s.fill} stroke={s.stroke} strokeWidth={1.5}/>}
          {s.s==='para'&&<polygon points="4,1 21,1 18,13 1,13" fill={s.fill} stroke={s.stroke} strokeWidth={1.5}/>}
          {s.s==='doc'&&<path d="M1,1 L21,1 L21,10 Q16,15 11,10 Q6,5 1,10 Z" fill={s.fill} stroke={s.stroke} strokeWidth={1.5}/>}
          {s.s==='dash'&&<rect x={1} y={1} width={20} height={12} rx={3} fill={s.fill} stroke={s.stroke} strokeWidth={1.5} strokeDasharray="3 1.5"/>}
        </svg>
        <span style={{fontSize:9,color:'#475569'}}>{s.label}</span>
      </span>
    ))}
  </div>)
}

// ── NODE EDIT MODAL ───────────────────────────────────────────
function EditNodeModal({node,onSave,onClose}){
  const [label,setLabel]=useState(node.label)
  const [sub,setSub]=useState(node.sub||'')
  const [type,setType]=useState(node.type)
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:420,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:16}}>✏️ Edit Node</div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Node Type</label>
          <select value={type} onChange={e=>setType(e.target.value)} style={{width:'100%',padding:'8px 10px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:11,outline:'none'}}>
            {['start','end','process','decision','io','document','ai'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Label <span style={{color:'#ef4444'}}>*</span></label>
          <input value={label} onChange={e=>setLabel(e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{marginBottom:18}}>
          <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Subtitle / Sub-label (optional)</label>
          <input value={sub} onChange={e=>setSub(e.target.value)} placeholder="e.g. Approved vendor list" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer'}}>Cancel</button>
          <button onClick={()=>onSave({...node,label,sub:sub||undefined,type})} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#1e3a5f,#1e40af)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>💾 Save Changes</button>
        </div>
      </div>
    </div>
  )
}

// ── ADD DEPT MODAL ────────────────────────────────────────────
function AddDeptModal({onAdd,onClose}){
  const [name,setName]=useState('')
  const [desc,setDesc]=useState('')
  const [gen,setGen]=useState(false)
  const [err,setErr]=useState('')

  const handleGenerate = async () => {
    if(!name.trim()){setErr('Please enter a department name.');return}
    setErr('');setGen(true)
    const data = await generateDeptAndTasks(name, desc)
    setGen(false)
    if (!data){setErr('AI generation failed. Please check API key.');return}
    onAdd({
      id: name.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,20),
      name: name.trim(),
      icon: data.icon||'🏢',
      color: data.color||'#6366f1',
      group: data.group||'Operations',
      tasks: (data.tasks||[]).map((t,i)=>({...t,id:t.id||`${name.slice(0,4).toLowerCase()}_t${i}`})),
      isCustom: true,
    })
    onClose()
  }

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:460,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:6}}>🤖 Add New Department</div>
        <div style={{fontSize:10,color:'#64748b',marginBottom:18}}>AI will generate the department structure, all tasks, and individual process flowcharts automatically.</div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Department Name <span style={{color:'#ef4444'}}>*</span></label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sustainability & ESG, Customer Success, Data Analytics..." style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{marginBottom:18}}>
          <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Description / Context (optional)</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} placeholder="What does this department do? Any specific functions or industry context?" style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:11,outline:'none',resize:'none',boxSizing:'border-box'}}/>
        </div>
        {err && <div style={{fontSize:10,color:'#ef4444',marginBottom:12,padding:'8px 12px',background:'#fef2f2',borderRadius:8}}>{err}</div>}
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer'}}>Cancel</button>
          <button onClick={handleGenerate} disabled={gen} style={{flex:2,padding:'10px',borderRadius:10,border:'none',background:gen?'#e2e8f0':'linear-gradient(135deg,#1e3a5f,#7c3aed)',color:gen?'#94a3b8':'#fff',fontSize:11,fontWeight:800,cursor:gen?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {gen?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'pfSpin 1s linear infinite'}}/>Generating with AI...</>:'🤖 Generate with AI'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ADD TASK MODAL ────────────────────────────────────────────
function AddTaskModal({dept,onAdd,onClose}){
  const [name,setName]=useState('')
  const [gen,setGen]=useState(false)
  const [err,setErr]=useState('')

  const handle = async () => {
    if(!name.trim()){setErr('Please enter a task name.');return}
    setErr('');setGen(true)
    const flow = await generateDeptFlow({name:dept.name,taskLabel:name.trim()})
    setGen(false)
    if(!flow){setErr('AI generation failed.');return}
    onAdd({taskLabel:name.trim(),flow})
    onClose()
  }

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:440,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:6}}>➕ Add Task to {dept.name}</div>
        <div style={{fontSize:10,color:'#64748b',marginBottom:18}}>AI will generate a complete swimlane process flowchart for this task.</div>
        <div style={{marginBottom:18}}>
          <label style={{fontSize:10,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Task / Function Name <span style={{color:'#ef4444'}}>*</span></label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Employee Grievance Handling, Vendor Evaluation..." style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
        </div>
        {err && <div style={{fontSize:10,color:'#ef4444',marginBottom:12,padding:'8px 12px',background:'#fef2f2',borderRadius:8}}>{err}</div>}
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer'}}>Cancel</button>
          <button onClick={handle} disabled={gen} style={{flex:2,padding:'10px',borderRadius:10,border:'none',background:gen?'#e2e8f0':'linear-gradient(135deg,#1e3a5f,#1e40af)',color:gen?'#94a3b8':'#fff',fontSize:11,fontWeight:800,cursor:gen?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {gen?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'pfSpin 1s linear infinite'}}/>Generating...</>:'🤖 Generate Flowchart'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function ProcessFlowPage(){
  const{persona}=useApp()

  // State
  const [depts,setDepts]=useState(()=>{
    try{const c=JSON.parse(localStorage.getItem('nephr_pf_custom_depts')||'[]');return[...DEPT_LIST,...c]}catch{return DEPT_LIST}
  })
  const [customFlows,setCustomFlows]=useState(()=>{try{return JSON.parse(localStorage.getItem('nephr_pf_custom_flows')||'{}')}catch{return{}}})
  const [editedFlows,setEditedFlows]=useState(()=>{try{return JSON.parse(localStorage.getItem('nephr_pf_edited_flows')||'{}')}catch{return{}}})

  const defaultDept = depts.find(d=>d.id===(persona?.id==='hr'?'hr':persona?.id==='executive'?'exec':'ops'))||depts[0]
  const [selDept,setSelDept]=useState(defaultDept)
  const [selTask,setSelTask]=useState(null)
  const [selNode,setSelNode]=useState(null)
  const [editMode,setEditMode]=useState(false)
  const [editNode,setEditNode]=useState(null)
  const [genTask,setGenTask]=useState(null) // task being AI-generated
  const [autoGenDone,setAutoGenDone]=useState(false)

  // AUTO-GENERATE on page load: generate flow for the first dept's first task
  useEffect(()=>{
    if (autoGenDone) return
    setAutoGenDone(true)
    const firstDept = depts[0]
    if (!firstDept || !firstDept.tasks || !firstDept.tasks[0]) return
    const firstTask = firstDept.tasks[0]
    setTimeout(async ()=>{
      const key = firstDept.id+'_'+firstTask.id
      if (customFlows[key] || (typeof builtinFlows !== 'undefined' && builtinFlows[key])) return
      notify('🤖 AI is generating the '+firstDept.name+' → '+firstTask.label+' process flow...')
      const flow = await generateTaskFlow(firstDept, firstTask.label)
      if (flow) {
        setCustomFlows(p=>({...p,[key]:flow}))
        setSelDept(firstDept)
        setSelTask(firstTask)
        notify('✅ AI flowchart ready for '+firstTask.label)
      } else {
        notify('⚠️ AI generation unavailable — browse existing flows below')
      }
    }, 1200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [showAddDept,setShowAddDept]=useState(false)
  const [showAddTask,setShowAddTask]=useState(false)
  const [search,setSearch]=useState('')
  const [msg,setMsg]=useState('')

  const notify=(m,ms=2500)=>{setMsg(m);setTimeout(()=>setMsg(''),ms)}

  // Lazy-load built-in task flows
  const [builtinFlows,setBuiltinFlows]=useState({})
  const loadFlow=async(taskId)=>{
    if(builtinFlows[taskId]||customFlows[taskId]||editedFlows[taskId])return
    // Dynamic import of the data module
    try{
      const m=await import('./ProcessFlowData.js')
      if(m.TASK_FLOWS?.[taskId]) setBuiltinFlows(p=>({...p,[taskId]:m.TASK_FLOWS[taskId]}))
    }catch{}
  }

  // Get the active flow for a task (edited > custom > builtin)
  const getFlow=(taskId)=>editedFlows[taskId]||customFlows[taskId]||builtinFlows[taskId]||null

  // When task selected, trigger load
  const selectTask=async(task)=>{
    setSelTask(task);setSelNode(null);setEditMode(false)
    loadFlow(task.id)
  }

  // Edit node save
  const saveEditedNode=(updatedNode)=>{
    if(!selTask)return
    const f=getFlow(selTask.id)
    if(!f)return
    const newFlow={...f,nodes:f.nodes.map(n=>n.id===updatedNode.id?updatedNode:n)}
    const updated={...editedFlows,[selTask.id]:newFlow}
    setEditedFlows(updated)
    localStorage.setItem('nephr_pf_edited_flows',JSON.stringify(updated))
    setEditNode(null)
    notify('✅ Node updated and saved!')
  }

  // AI-generate a task flow on the fly
  const aiGenerateTaskFlow=async(task)=>{
    setGenTask(task.id)
    const flow=await generateDeptFlow({name:selDept.name,taskLabel:task.label})
    setGenTask(null)
    if(!flow){notify('❌ AI generation failed. Check API key.');return}
    const updated={...customFlows,[task.id]:flow}
    setCustomFlows(updated)
    localStorage.setItem('nephr_pf_custom_flows',JSON.stringify(updated))
    setBuiltinFlows(p=>({...p,[task.id]:flow}))
    notify('✅ AI flowchart generated!')
  }

  // Add new department
  const addDept=(d)=>{
    const updated=[...depts,d]
    setDepts(updated)
    const customs=updated.filter(x=>x.isCustom)
    localStorage.setItem('nephr_pf_custom_depts',JSON.stringify(customs))
    setSelDept(d);setSelTask(null)
    notify(`✅ "${d.name}" department added with ${d.tasks.length} tasks!`,3000)
  }

  // Add new task to existing dept
  const addTask=({taskLabel,flow})=>{
    const icon='⚙️'
    const taskId=`${selDept.id}_${taskLabel.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,15)}_${Date.now().toString().slice(-4)}`
    const newTask={id:taskId,icon,label:taskLabel}
    const updatedDepts=depts.map(d=>d.id===selDept.id?{...d,tasks:[...d.tasks,newTask]}:d)
    setDepts(updatedDepts)
    const customs=updatedDepts.filter(x=>x.isCustom)
    localStorage.setItem('nephr_pf_custom_depts',JSON.stringify(customs))
    const updatedFlows={...customFlows,[taskId]:flow}
    setCustomFlows(updatedFlows)
    localStorage.setItem('nephr_pf_custom_flows',JSON.stringify(updatedFlows))
    setSelDept(updatedDepts.find(d=>d.id===selDept.id))
    notify(`✅ Task "${taskLabel}" added with AI flowchart!`)
  }

  const resetFlow=()=>{
    if(!selTask)return
    const updated={...editedFlows};delete updated[selTask.id]
    setEditedFlows(updated)
    localStorage.setItem('nephr_pf_edited_flows',JSON.stringify(updated))
    notify('✅ Reverted to original flow.')
  }

  // Groups for sidebar
  const groups={}
  depts.filter(d=>!search||d.name.toLowerCase().includes(search.toLowerCase())||d.tasks.some(t=>t.label.toLowerCase().includes(search.toLowerCase()))).forEach(d=>{if(!groups[d.group])groups[d.group]=[];groups[d.group].push(d)})

  const flow=selTask?getFlow(selTask.id):null
  const stats=flow?{total:flow.nodes.filter(n=>n.type!=='start'&&n.type!=='end').length,ai:flow.nodes.filter(n=>n.type==='ai').length,dec:flow.nodes.filter(n=>n.type==='decision').length}:null

  return(
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <style>{`@keyframes pfSpin{to{transform:rotate(360deg)}}`}</style>
      {editNode&&<EditNodeModal node={editNode} onSave={saveEditedNode} onClose={()=>setEditNode(null)}/>}
      {showAddDept&&<AddDeptModal onAdd={addDept} onClose={()=>setShowAddDept(false)}/>}
      {showAddTask&&<AddTaskModal dept={selDept} onAdd={addTask} onClose={()=>setShowAddTask(false)}/>}

      {/* Header */}
      <div style={{marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',justifyContent:'space-between'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <h2 style={{fontSize:20,fontWeight:900,color:'#0f172a',margin:0}}>Process Flow Charts</h2>
              <span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:20,border:'1px solid #bfdbfe'}}>AI-Powered</span>
            </div>
            <p style={{fontSize:11,color:'#94a3b8',margin:'3px 0 0'}}>{depts.length} departments · {Object.keys({...builtinFlows,...customFlows}).length}+ task flowcharts · Edit mode · AI auto-generation</p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            {msg&&<div style={{fontSize:10,fontWeight:700,color:'#15803d',padding:'5px 12px',background:'#f0fdf4',borderRadius:8,border:'1px solid #bbf7d0'}}>{msg}</div>}
            {selTask&&(
              <>
                <button onClick={()=>setEditMode(m=>!m)} style={{padding:'6px 14px',borderRadius:9,border:`1.5px solid ${editMode?'#f59e0b':'#e2e8f0'}`,background:editMode?'#fffbeb':'#fff',color:editMode?'#92400e':'#374151',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                  {editMode?'✏️ Editing':'✏️ Edit Mode'}
                </button>
                {editedFlows[selTask.id]&&<button onClick={resetFlow} style={{padding:'6px 12px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:10,cursor:'pointer'}}>↩ Reset</button>}
                <button onClick={()=>setSelTask(null)} style={{padding:'6px 12px',borderRadius:9,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:10,fontWeight:600,cursor:'pointer'}}>← Back</button>
              </>
            )}
          </div>
        </div>
        {editMode&&selTask&&<div style={{marginTop:8,fontSize:10,color:'#92400e',background:'#fffbeb',padding:'6px 14px',borderRadius:8,border:'1px solid #fde68a'}}>✏️ Edit Mode ON — Click any node (or the yellow ✏️ badge) to edit its label, subtitle, or type. Changes are auto-saved.</div>}
      </div>

      <div style={{display:'flex',gap:14}}>
        {/* Sidebar */}
        <div style={{width:220,flexShrink:0}}>
          <div style={{display:'flex',gap:4,marginBottom:8}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:11,outline:'none'}}/>
            <button onClick={()=>setShowAddDept(true)} title="Add new department with AI" style={{flexShrink:0,width:32,height:32,borderRadius:8,border:'none',background:'linear-gradient(135deg,#1e3a5f,#7c3aed)',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
          </div>
          <div style={{maxHeight:'78vh',overflowY:'auto',border:'1px solid #e2e8f0',borderRadius:12,background:'#fff'}}>
            {Object.entries(groups).map(([group,ds])=>(
              <div key={group}>
                <div style={{padding:'5px 10px',background:'#f8fafc',fontSize:9,fontWeight:800,color:'#64748b',borderBottom:'1px solid #f1f5f9',letterSpacing:'0.06em'}}>{group.toUpperCase()}</div>
                {ds.map(d=>{
                  const isA=selDept.id===d.id
                  return(
                    <div key={d.id} onClick={()=>{setSelDept(d);setSelTask(null);setSelNode(null);setEditMode(false)}}
                      style={{padding:'8px 10px',cursor:'pointer',background:isA?d.color+'18':'#fff',borderLeft:`3px solid ${isA?d.color:'transparent'}`,borderBottom:'1px solid #f8fafc',display:'flex',alignItems:'center',gap:8,transition:'all .12s'}}>
                      <span style={{fontSize:15,flexShrink:0}}>{d.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:isA?700:500,color:isA?d.color:'#334155',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</div>
                        <div style={{fontSize:8,color:'#94a3b8'}}>{d.tasks.length} tasks{d.isCustom?' · Custom':''}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div style={{flex:1,minWidth:0}}>

          {/* Department overview */}
          {!selTask&&(
            <div>
              <div style={{background:`${selDept.color}10`,border:`1px solid ${selDept.color}30`,borderRadius:14,padding:'14px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <span style={{fontSize:32}}>{selDept.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:900,color:'#0f172a'}}>{selDept.name}</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>
                    {selDept.tasks.length} tasks — click any task card to view its detailed swimlane process flowchart
                  </div>
                </div>
                <button onClick={()=>setShowAddTask(true)}
                  style={{padding:'7px 14px',borderRadius:10,border:'none',background:`linear-gradient(135deg,${selDept.color},${selDept.color}cc)`,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                  + Add Task (AI)
                </button>
              </div>

              {/* Task grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                {selDept.tasks.map(task=>{
                  const f=getFlow(task.id)
                  const isGenerating=genTask===task.id
                  const hasFlow=!!f
                  return(
                    <div key={task.id} style={{background:'#fff',borderRadius:13,padding:'16px',border:`1.5px solid ${hasFlow?selDept.color+'40':'#e2e8f0'}`,cursor:hasFlow?'pointer':'default',transition:'all .2s',boxShadow:'0 2px 8px rgba(0,0,0,.05)',opacity:isGenerating?.7:1}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
                        <div style={{width:34,height:34,borderRadius:10,background:`${selDept.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{task.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,fontWeight:700,color:'#0f172a',lineHeight:1.35}}>{task.label}</div>
                          {hasFlow&&!isGenerating&&(
                            <div style={{fontSize:8,color:selDept.color,fontWeight:700,marginTop:3}}>
                              {f.nodes.filter(n=>n.type!=='start'&&n.type!=='end').length} steps · {f.nodes.filter(n=>n.type==='ai').length} AI · {f.nodes.filter(n=>n.type==='decision').length} decisions
                            </div>
                          )}
                        </div>
                      </div>
                      {isGenerating?(
                        <div style={{fontSize:9,color:selDept.color,fontWeight:700,display:'flex',alignItems:'center',gap:6}}>
                          <span style={{width:12,height:12,border:`2px solid ${selDept.color}30`,borderTop:`2px solid ${selDept.color}`,borderRadius:'50%',display:'inline-block',animation:'pfSpin 1s linear infinite'}}/>
                          Generating AI flowchart...
                        </div>
                      ):hasFlow?(
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>selectTask(task)} style={{flex:1,padding:'6px',borderRadius:9,border:'none',background:`${selDept.color}15`,color:selDept.color,fontSize:9,fontWeight:700,cursor:'pointer'}}>▶ View Flow</button>
                          <button onClick={e=>{e.stopPropagation();aiGenerateTaskFlow(task)}} title="Regenerate with AI" style={{padding:'6px 8px',borderRadius:9,border:`1px solid ${selDept.color}30`,background:'#fff',color:selDept.color,fontSize:10,cursor:'pointer'}}>🔄</button>
                        </div>
                      ):(
                        <button onClick={()=>aiGenerateTaskFlow(task)} style={{width:'100%',padding:'7px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#1e3a5f,#7c3aed)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>🤖 Generate AI Flowchart</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Task flowchart view */}
          {selTask&&(()=>{
            const f=flow
            return(
              <div>
                {/* Task header */}
                <div style={{background:`${selDept.color}10`,border:`1px solid ${selDept.color}30`,borderRadius:14,padding:'12px 18px',marginBottom:10,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  <span style={{fontSize:22}}>{selTask.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      <span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{selTask.label}</span>
                      <span style={{fontSize:9,color:'#64748b'}}>— {selDept.name}</span>
                      {editedFlows[selTask.id]&&<span style={{fontSize:8,fontWeight:700,padding:'1px 7px',borderRadius:8,background:'#fffbeb',color:'#92400e'}}>Modified</span>}
                    </div>
                    {f&&<div style={{fontSize:10,color:'#64748b',marginTop:2}}>{f.subtitle}</div>}
                  </div>
                  {stats&&(
                    <div style={{display:'flex',gap:8,flexShrink:0}}>
                      {[{l:'Steps',v:stats.total,c:'#3b82f6'},{l:'AI',v:stats.ai,c:'#8b5cf6'},{l:'Decisions',v:stats.dec,c:'#f59e0b'}].map((s,i)=>(
                        <div key={i} style={{textAlign:'center',padding:'4px 10px',background:'#fff',borderRadius:8,border:'1px solid #e2e8f0'}}>
                          <div style={{fontSize:14,fontWeight:900,color:s.c}}>{s.v}</div>
                          <div style={{fontSize:8,color:'#94a3b8'}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Breadcrumb + other tasks */}
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                  <span style={{cursor:'pointer',color:selDept.color,fontWeight:700,fontSize:10}} onClick={()=>setSelTask(null)}>{selDept.icon} {selDept.name}</span>
                  <span style={{color:'#94a3b8',fontSize:10}}>›</span>
                  <span style={{color:'#374151',fontWeight:700,fontSize:10}}>{selTask.label}</span>
                  <div style={{flex:1}}/>
                  {selDept.tasks.filter(t=>t.id!==selTask.id).slice(0,4).map(t=>(
                    <button key={t.id} onClick={()=>selectTask(t)} style={{padding:'3px 10px',borderRadius:20,border:`1px solid ${selDept.color}40`,background:`${selDept.color}08`,color:selDept.color,fontSize:8,fontWeight:600,cursor:'pointer'}}>
                      {t.icon} {t.label.split(' ').slice(0,3).join(' ')}
                    </button>
                  ))}
                </div>

                <Legend/>

                {f?(
                  <>
                    <div style={{background:'#fff',border:`1px solid ${selDept.color}30`,borderRadius:14,overflow:'auto'}}>
                      <FlowChart flow={f} color={selDept.color} selNode={selNode} onSelNode={setSelNode} editMode={editMode} onEditNode={setEditNode}/>
                    </div>
                    {selNode&&(()=>{
                      const n=f.nodes.find(x=>x.id===selNode);if(!n)return null
                      const tl={start:'Start',end:'End',process:'Process Step',decision:'Decision Point',io:'Input / Output',document:'Document',ai:'AI Step'}
                      return(
                        <div style={{marginTop:10,background:'#fff',borderRadius:12,padding:'12px 16px',border:`1px solid ${selDept.color}30`,display:'flex',gap:12,alignItems:'flex-start'}}>
                          <span style={{fontSize:22,flexShrink:0}}>{n.type==='ai'?'🤖':n.type==='decision'?'💎':n.type==='document'?'📄':n.type==='io'?'📥':'▶️'}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{n.label}</div>
                            {n.sub&&<div style={{fontSize:10,color:'#64748b',marginTop:2}}>{n.sub}</div>}
                            <span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:8,background:`${selDept.color}15`,color:selDept.color,display:'inline-block',marginTop:5}}>{tl[n.type]||n.type}</span>
                          </div>
                          {editMode&&<button onClick={()=>setEditNode(n)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #f59e0b',background:'#fffbeb',color:'#92400e',fontSize:9,fontWeight:700,cursor:'pointer'}}>✏️ Edit</button>}
                          <button onClick={()=>setSelNode(null)} style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:18,flexShrink:0}}>✕</button>
                        </div>
                      )
                    })()}
                  </>
                ):(
                  <div style={{background:'#fff',borderRadius:14,padding:'60px',textAlign:'center',border:'1px dashed #e2e8f0'}}>
                    <div style={{fontSize:36,marginBottom:12}}>🤖</div>
                    <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:6}}>No flowchart yet</div>
                    <div style={{fontSize:11,color:'#64748b',marginBottom:18}}>AI will generate a complete professional swimlane flowchart for "{selTask.label}"</div>
                    <button onClick={()=>aiGenerateTaskFlow(selTask)} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#1e3a5f,#7c3aed)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🤖 Generate Flowchart Now</button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

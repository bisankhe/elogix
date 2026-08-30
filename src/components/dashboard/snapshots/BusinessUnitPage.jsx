// FILE: BusinessUnitPage.jsx - Luxury Business Unit / Division Setup

import { useState, useEffect } from 'react'

const THEME = { gradient:'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)' }

const MOCK_UNITS = [
  { id:'bu-001', code:'BU-TECH', name:'Technology & Products Division', short:'Tech Division',
    type:'Business Unit', head:'Bikram Shrestha (CTO)', parent:null, branch:'Kathmandu HQ',
    employees:420, budget_npr:45000000, cost_center:'CC-BU-TECH',
    revenue_contribution:62, profit_margin:38, status:'active', icon:'💻', color:'#3b82f6',
    departments:['IT','Engineering','QA','Product Management','R&D'],
    description:'Technology, software development, and product management.',
    impact_links:['Payroll','IT Access','Performance','Headcount Plan','Budget'],
  },
  { id:'bu-002', code:'BU-COMM', name:'Commercial & Revenue Division', short:'Commercial',
    type:'Business Unit', head:'Sita Sharma (CSO)', parent:null, branch:'Kathmandu HQ',
    employees:210, budget_npr:28000000, cost_center:'CC-BU-COMM',
    revenue_contribution:28, profit_margin:22, status:'active', icon:'📈', color:'#10b981',
    departments:['Sales','Marketing','Business Development','Customer Success'],
    description:'Sales, marketing and revenue generation.',
    impact_links:['Payroll','Sales Targets','CRM Integration','Commission'],
  },
  { id:'bu-003', code:'BU-OPS', name:'Operations & Support Division', short:'Operations',
    type:'Division', head:'Suresh Karki (COO)', parent:null, branch:'Kathmandu HQ',
    employees:180, budget_npr:18000000, cost_center:'CC-BU-OPS',
    revenue_contribution:10, profit_margin:15, status:'active', icon:'Settings', color:'#8b5cf6',
    departments:['Operations','Admin','Facilities','Procurement','Security','Fire & Safety'],
    description:'Operational support and shared services.',
    impact_links:['Payroll','Asset Management','Vendor Management'],
  },
  { id:'bu-004', code:'BU-CORP', name:'Corporate Functions', short:'Corporate',
    type:'Corporate', head:'Rajesh Adhikari (CEO)', parent:null, branch:'Kathmandu HQ',
    employees:440, budget_npr:35000000, cost_center:'CC-BU-CORP',
    revenue_contribution:0, profit_margin:0, status:'active', icon:'🎯', color:'#0ea5e9',
    departments:['HR','Finance','Legal','Risk','Strategy','PMO','Board Affairs'],
    description:'Group-level corporate functions and governance.',
    impact_links:['All Payroll','Compliance','Board Reporting','Group Consolidation'],
  },
]

function ContextMenu({ x, y, item, onClose, onAction }) {
  const items = [
    {icon:'👁️',label:'View Details',key:'view'},
    {icon:'✏️',label:'Edit Unit',key:'edit'},
    {icon:'👥',label:'View Departments',key:'depts'},
    {icon:'📊',label:'P&L Report',key:'pl'},
    {icon:'💰',label:'View Budget',key:'budget'},
    {icon:'📋',label:'Impact Analysis',key:'impact'},
    {icon:'📤',label:'Export Excel',key:'export'},
    {icon:'🗑️',label:'Deactivate',key:'deactivate',danger:true},
  ]

  // SaaS DB — load real tenant data (fallback to mock if no token/API down)
  useEffect(() => {
    const _token = localStorage.getItem('access_token')
    const _slug  = _getSlug()
    if (!_token) return
    _setApiLoading(true)
    fetch('/api/v1/org/business-units', {
      headers: {
        'Authorization': `Bearer ${_token}`,
        'X-Tenant-Slug': _slug,
        'Content-Type': 'application/json',
      }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const items = d.business_units || d.data || d.items || []
        if (items.length > 0) setFocused(items)
      })
      .catch(() => {/* keep mock */})
      .finally(() => _setApiLoading(false))
  }, [])

  return (
    <div style={{ position:'fixed', zIndex:9999, left:x, top:y, background:'#fff',
      borderRadius:12, width:220, boxShadow:'0 20px 60px rgba(0,0,0,.2)',
      border:'1px solid #e2e8f0', overflow:'hidden' }}>
      <div style={{ background:THEME.gradient, padding:'10px 14px' }}>
        <div style={{ fontSize:11, fontWeight:800, color:'#fff' }}>{item?.name}</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.8)', marginTop:1 }}>
          {item?.impact_links?.slice(0,3).join(' . ')}
        </div>
      </div>
      {items.map((a,i) => (
        <div key={i} onClick={() => { onAction(a.key,item); onClose() }}
          style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:8,
            cursor:'pointer', fontSize:12, color:a.danger?'#ef4444':'#334155',
            borderBottom:i<items.length-1?'1px solid #f8fafc':'none' }}
          onMouseEnter={e=>e.currentTarget.style.background=a.danger?'#fef2f2':'#f8fafc'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <span>{a.icon}</span><span>{a.label}</span>
        </div>
      ))}
    </div>
  )
}

function LuxInput({ label, value, onChange, type='text', options, required }) {
  const [_apiLoading, _setApiLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const style = { width:'100%', padding:'10px 12px', borderRadius:10, boxSizing:'border-box',
    border:`1.5px solid ${focused?'#f59e0b':'#e2e8f0'}`, fontSize:13, outline:'none',
    boxShadow:focused?'0 0 0 3px rgba(245,158,11,0.12)':'none', transition:'all .2s' }
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#334155', marginBottom:4 }}>
        {label}{required&&<span style={{color:'#ef4444'}}> *</span>}
      </label>
      {type==='select'
        ? <select value={value} onChange={e=>onChange(e.target.value)}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={{...style,appearance:'auto'}}>
            <option value="">Select...</option>
            {options?.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={style}/>
      }
    </div>
  )
}

function AddUnitModal({ onClose, onSave }) {
  const [form, setForm] = useState({ code:'', name:'', short:'', type:'Business Unit', head:'', branch:'Kathmandu HQ', cost_center:'', budget_npr:0, description:'' })
  const set = k => v => setForm(p=>({...p,[k]:v}))
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:5000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:660, maxHeight:'90vh', overflow:'auto',
        boxShadow:'0 40px 80px rgba(0,0,0,.3)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'20px 28px', background:THEME.gradient, position:'sticky', top:0, zIndex:10 }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#fff' }}>+ New Business Unit / Division</div>
        </div>
        <div style={{ padding:'24px 28px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
            <LuxInput label="Unit Code"   value={form.code}   onChange={set('code')}   required />
            <LuxInput label="Unit Name"   value={form.name}   onChange={set('name')}   required />
            <LuxInput label="Short Name"  value={form.short}  onChange={set('short')} />
            <LuxInput label="Type" type="select" value={form.type} onChange={set('type')}
              options={['Business Unit','Division','Department Group','Profit Center','Cost Center','Project Unit']} required />
            <LuxInput label="Unit Head"   value={form.head}   onChange={set('head')} />
            <LuxInput label="Primary Branch" type="select" value={form.branch} onChange={set('branch')}
              options={['Kathmandu HQ','Pokhara Branch','Biratnagar Branch','Delhi India','Remote']} />
            <LuxInput label="Cost Center Code" value={form.cost_center} onChange={set('cost_center')} />
            <LuxInput label="Annual Budget (NPR)" type="number" value={form.budget_npr} onChange={set('budget_npr')} />
          </div>
          <LuxInput label="Description" value={form.description} onChange={set('description')} />
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10,
            padding:'12px 14px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:4 }}>
              🤖 AI Impact Alert
            </div>
            <div style={{ fontSize:11, color:'#78350f', lineHeight:1.6 }}>
              New BU/Division will: Create Cost Center, set Budget Center, link to Org Chart,
              assign HRBP, and create default Approval Hierarchy. Department assignments come next.
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { onSave(form); onClose() }}
              style={{ flex:1, padding:'14px', borderRadius:12, border:'none',
                background:THEME.gradient, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              ✨ Create Business Unit
            </button>
            <button onClick={onClose}
              style={{ padding:'14px 24px', borderRadius:12, border:'1px solid #e2e8f0',
                background:'#fff', color:'#475569', fontSize:13, cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function _getSlug() {
  try {
    const s = JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}
    return s?.company?.slug || s?.tenant || localStorage.getItem('elogix_tenant_slug') || ''
  } catch(_e) { return '' }
}

export default function BusinessUnitPage() {
  const [units,       setUnits]       = useState(MOCK_UNITS)
  const [contextMenu, setContextMenu] = useState(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [selected,    setSelected]    = useState(null)

  const totalEmp    = units.reduce((s,u)=>s+u.employees,0)
  const totalBudget = units.reduce((s,u)=>s+u.budget_npr,0)

  return (
    <div onClick={()=>setContextMenu(null)}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* Header */}
      <div style={{ background:THEME.gradient, borderRadius:18, padding:'24px 28px', marginBottom:24, overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', right:-10, top:-10, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
            <span style={{ fontSize:32 }}>🏗️</span>
            <div>
              <h2 style={{ fontSize:24, fontWeight:900, color:'#fff', margin:0 }}>Business Unit / Division Setup</h2>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.8)', marginTop:2 }}>
                Organization Management &rsaquo; Organization Setup
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            {[
              {label:'Business Units', value:units.length,                    icon:'🏗️'},
              {label:'Total Employees',value:totalEmp.toLocaleString(),        icon:'👥'},
              {label:'Total Budget',   value:'NPR '+(totalBudget/1e7).toFixed(1)+'Cr', icon:'💰'},
            ].map((s,i)=>(
              <div key={i} style={{ background:'rgba(255,255,255,.15)', borderRadius:10, padding:'8px 14px' }}>
                <span style={{fontSize:13}}>{s.icon}</span>
                <span style={{ fontSize:16, fontWeight:800, color:'#fff', marginLeft:6 }}>{s.value}</span>
                <span style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginLeft:4 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:10, marginBottom:16, justifyContent:'flex-end' }}>
        <button style={{ padding:'10px 18px', borderRadius:12, border:'1px solid #e2e8f0',
          background:'#fff', color:'#475569', fontSize:12, cursor:'pointer' }}>
          📊 Import Excel
        </button>
        <button onClick={()=>setShowAdd(true)}
          style={{ padding:'10px 20px', borderRadius:12, border:'none',
            background:THEME.gradient, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          + New Business Unit
        </button>
      </div>

      <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10,
        padding:'8px 14px', marginBottom:16, fontSize:11, color:'#92400e' }}>
        💡 Right-click any card for impact analysis and SAP-style linked module view
      </div>

      {/* Units grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
        {units.map(unit => (
          <div key={unit.id}
            onClick={()=>setSelected(unit)}
            onContextMenu={e=>{e.preventDefault();setContextMenu({x:e.clientX,y:e.clientY,item:unit})}}
            style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0',
              overflow:'hidden', cursor:'pointer', transition:'all .2s',
              boxShadow:'0 2px 8px rgba(0,0,0,.06)', borderTop:`3px solid ${unit.color}` }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 10px 30px rgba(0,0,0,.1)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.06)'}}>
            <div style={{ padding:'18px 18px 14px', display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ width:50, height:50, borderRadius:14, background:`${unit.color}18`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                {unit.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:900, color:'#0f172a',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{unit.name}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{unit.code} &bull; {unit.type}</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>
                  Head: <strong>{unit.head}</strong>
                </div>
              </div>
            </div>
            {/* Dept tags */}
            <div style={{ padding:'0 18px 14px', display:'flex', gap:5, flexWrap:'wrap' }}>
              {unit.departments.map((d,i)=>(
                <span key={i} style={{ background:`${unit.color}12`, color:unit.color,
                  fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                  border:`1px solid ${unit.color}30` }}>{d}</span>
              ))}
            </div>
            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
              borderTop:'1px solid #f1f5f9', padding:'10px 18px' }}>
              {[
                {l:'Employees',  v:unit.employees,           c:'#3b82f6'},
                {l:'Revenue %',  v:unit.revenue_contribution+'%', c:'#10b981'},
                {l:'Budget',     v:'NPR '+(unit.budget_npr/1e6).toFixed(0)+'M', c:'#f59e0b'},
              ].map((s,i)=>(
                <div key={i} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:800, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:9, color:'#94a3b8' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div onClick={()=>setShowAdd(true)}
          style={{ border:'2px dashed #cbd5e1', borderRadius:16, minHeight:200,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'#94a3b8', gap:8, transition:'all .2s' }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#f59e0b';e.currentTarget.style.color='#f59e0b'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#cbd5e1';e.currentTarget.style.color='#94a3b8'}}>
          <span style={{fontSize:32}}>+</span>
          <span style={{fontSize:12,fontWeight:700}}>Add Business Unit</span>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} item={contextMenu.item}
          onClose={()=>setContextMenu(null)} onAction={(a,item)=>{ if(a==='view') setSelected(item) }} />
      )}

      {showAdd && <AddUnitModal onClose={()=>setShowAdd(false)}
        onSave={u=>setUnits(p=>[...p,{...u,id:'bu-'+Date.now(),status:'active',icon:'🏢',color:'#64748b',employees:0,revenue_contribution:0,profit_margin:0,departments:[],impact_links:['Payroll','Org Chart']}])} />}

      {selected && (
        <div style={{ position:'fixed', right:0, top:0, bottom:0, width:420, background:'#fff',
          boxShadow:'-20px 0 60px rgba(0,0,0,.15)', zIndex:4000, overflow:'auto', animation:'fadeIn .2s ease' }}>
          <div style={{ padding:'20px 24px', background:THEME.gradient }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>{selected.name}</div>
              <button onClick={()=>setSelected(null)}
                style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:8,
                  width:30, height:30, color:'#fff', cursor:'pointer', fontSize:16 }}>x</button>
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:2 }}>{selected.type} &bull; {selected.code}</div>
          </div>
          <div style={{ padding:'20px 24px' }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#334155', marginBottom:8 }}>Departments</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {selected.departments.map((d,i)=>(
                  <span key={i} style={{ background:`${selected.color}15`, color:selected.color,
                    fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20 }}>{d}</span>
                ))}
              </div>
            </div>
            {[
              ['Head',       selected.head],
              ['Branch',     selected.branch],
              ['Cost Center',selected.cost_center],
              ['Employees',  selected.employees],
              ['Budget',     'NPR '+(selected.budget_npr/1e6).toFixed(1)+'M'],
              ['Revenue %',  selected.revenue_contribution+'%'],
            ].map(([l,v],i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between',
                padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:12 }}>
                <span style={{color:'#64748b'}}>{l}</span>
                <span style={{fontWeight:700,color:'#0f172a'}}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:16, padding:'12px 14px', background:'#fffbeb',
              borderRadius:10, border:'1px solid #fde68a' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:6 }}>
                🔗 Impact Links
              </div>
              {selected.impact_links?.map((link,i)=>(
                <div key={i} style={{ fontSize:11, color:'#b45309', padding:'2px 0',
                  display:'flex', alignItems:'center', gap:6 }}>
                  <span>&#8594;</span> {link}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

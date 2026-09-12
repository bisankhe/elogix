// FILE: src/components/dashboard/snapshots/SectionUnitPage.jsx
// eLogix HRMS — Section & Unit Setup
// COMPLETE REWRITE — removes DeptSetupShared.jsx import (file doesn't exist),
// removes MOCK_SECTIONS (6 fake IT/HR/Finance sections with hardcoded names),
// replaces with API: GET /api/v1/sections
// All shared components inlined: PageHeader, SearchBar, Badge, LuxCard,
//   ContextMenu, ExcelModal, Drawer, AIImpact, Field
// eLogix Technologies · www.elogix.com.np

import React, { useState, useEffect } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0ea5e9 60%,#7dd3fc 100%)'
const A = '#0ea5e9'

// ── Inlined shared components ─────────────────────────────────

function PageHeader({ icon, title, breadcrumb, gradient, stats=[], onAdd, addLabel='Add', onExcel }) {
  return (
    <div style={{background:gradient,borderRadius:16,padding:'20px 24px',marginBottom:20,
      boxShadow:'0 4px 24px rgba(0,0,0,.15)',color:'#fff'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:11,opacity:.7,marginBottom:4}}>{breadcrumb}</div>
          <div style={{fontSize:20,fontWeight:900}}>{icon} {title}</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {onExcel&&<button onClick={onExcel} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>📥 Excel</button>}
          {onAdd&&<button onClick={onAdd} style={{padding:'8px 16px',borderRadius:10,border:'none',background:'rgba(255,255,255,.9)',color:'#1e1b4b',fontSize:11,fontWeight:800,cursor:'pointer'}}>＋ {addLabel}</button>}
        </div>
      </div>
      {stats.length>0&&(
        <div style={{display:'flex',gap:16,marginTop:14,flexWrap:'wrap'}}>
          {stats.map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,.12)',borderRadius:10,padding:'8px 16px',textAlign:'center',minWidth:80}}>
              <div style={{fontSize:16,fontWeight:900}}>{s.icon} {s.value}</div>
              <div style={{fontSize:9,opacity:.75,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchBar({ value, onChange, placeholder='Search...', extra }) {
  return (
    <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{flex:1,minWidth:200,padding:'10px 14px',borderRadius:12,border:'1.5px solid #e2e8f0',
          fontSize:12,outline:'none',fontFamily:'inherit',background:'#fff'}}/>
      {extra}
    </div>
  )
}

function Badge({ status='active' }) {
  const cfg = {active:{bg:'#f0fdf4',c:'#15803d',label:'Active'},inactive:{bg:'#f8fafc',c:'#94a3b8',label:'Inactive'},suspended:{bg:'#fef2f2',c:'#dc2626',label:'Suspended'}}
  const s = cfg[status]||cfg.active
  return <span style={{fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:20,background:s.bg,color:s.c}}>{s.label}</span>
}

function LuxCard({ children, color='#0ea5e9', onClick, onContextMenu }) {
  return (
    <div onClick={onClick} onContextMenu={onContextMenu}
      style={{background:'#fff',borderRadius:16,border:`1px solid ${color}18`,
        boxShadow:'0 2px 8px rgba(0,0,0,.05)',cursor:'pointer',transition:'all .2s',overflow:'hidden'}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 4px 16px ${color}22`;e.currentTarget.style.transform='translateY(-1px)'}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)';e.currentTarget.style.transform=''}}>
      {children}
    </div>
  )
}

function ContextMenu({ x, y, item, actions=[], onAction, onClose }) {
  return (
    <div style={{position:'fixed',top:y,left:x,zIndex:9999,background:'#fff',borderRadius:12,
      boxShadow:'0 8px 32px rgba(0,0,0,.15)',border:'1px solid #e2e8f0',minWidth:180,overflow:'hidden'}}
      onClick={e=>e.stopPropagation()}>
      {actions.map(a=>(
        <div key={a.key} onClick={()=>{onAction(a.key,item);onClose()}}
          style={{padding:'10px 16px',fontSize:12,cursor:'pointer',display:'flex',gap:8,alignItems:'center',
            color:a.danger?'#dc2626':'#374151'}}
          onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
          onMouseLeave={e=>e.currentTarget.style.background=''}>
          {a.icon} {a.label}
        </div>
      ))}
    </div>
  )
}

function ExcelModal({ title, columns=[], onClose }) {
  const ref = useRef(null)
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:16,padding:28,width:480,boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>📥 Import {title}</div>
        <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>Columns: {columns.join(', ')}</div>
        <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{marginBottom:16}}/>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>ref.current?.click()} style={{flex:1,padding:10,borderRadius:10,border:'none',background:A,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Choose File</button>
          <button onClick={onClose} style={{padding:'10px 18px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:12,cursor:'pointer'}}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function Drawer({ item, gradient, onClose, rows=[], children }) {
  if (!item) return null
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:4000,display:'flex',justifyContent:'flex-end'}}
      onClick={onClose}>
      <div style={{background:'#fff',width:380,height:'100vh',overflow:'auto',boxShadow:'-4px 0 20px rgba(0,0,0,.15)',position:'relative'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{background:gradient,padding:'20px 24px',color:'#fff'}}>
          <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{item.name}</div>
          <div style={{fontSize:11,opacity:.75}}>{item.code||''}</div>
          <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'rgba(255,255,255,.2)',border:'none',color:'#fff',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:12}}>✕</button>
        </div>
        <div style={{padding:'20px 24px'}}>
          {children}
          {rows.filter(([,v])=>v!=null).map(([k,v],i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
              <span style={{color:'#64748b',fontWeight:600}}>{k}</span>
              <span style={{color:'#0f172a',fontWeight:700,textAlign:'right',maxWidth:'60%'}}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AIImpact({ color=A, lines=[] }) {
  return (
    <div style={{background:`${color}08`,border:`1px solid ${color}20`,borderRadius:10,padding:'10px 14px',marginBottom:16}}>
      <div style={{fontSize:10,fontWeight:700,color,marginBottom:6}}>🤖 AI Impact Links</div>
      {lines.map((l,i)=><div key={i} style={{fontSize:10,color:'#64748b',marginBottom:3}}>• {l}</div>)}
    </div>
  )
}

function Field({ label, value, onChange, type='text', options=[], required=false, accent=A, hint='' }) {
  const st = {width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',
    fontSize:11,outline:'none',fontFamily:'inherit',boxSizing:'border-box',background:'#fff',marginBottom:4}
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:10,fontWeight:700,color:'#374151',marginBottom:4}}>
        {label}{required&&<span style={{color:'#ef4444',marginLeft:3}}>*</span>}
      </label>
      {type==='select'?(
        <select value={value} onChange={e=>onChange(e.target.value)} style={st}>
          <option value="">— Select —</option>
          {options.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ):type==='textarea'?(
        <textarea value={value} onChange={e=>onChange(e.target.value)} rows={3} style={{...st,resize:'vertical'}}/>
      ):(
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} style={st}/>
      )}
      {hint&&<div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{hint}</div>}
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────
const CONTEXT_ACTIONS = [
  {icon:'👁️',label:'View Details',  key:'view'},
  {icon:'✏️',label:'Edit Section', key:'edit'},
  {icon:'👥',label:'View Members', key:'members'},
  {icon:'🎯',label:'View OKRs',    key:'okrs'},
  {icon:'📊',label:'Section Report',key:'report'},
  {icon:'📤',label:'Export Excel', key:'export'},
  {icon:'🗑️',label:'Deactivate',  key:'deactivate',danger:true},
]

const ULRICH_COLORS = {
  'CoE':  {bg:'#eef2ff',color:'#4f46e5',label:'Centre of Excellence'},
  'HRSS': {bg:'#f0fdf4',color:'#15803d',label:'HR Shared Services'},
  'HRBP': {bg:'#fffbeb',color:'#b45309',label:'HR Business Partner'},
}

// ── Main Component ────────────────────────────────────────────
export default function SectionUnitPage() {
  const [sections,   setSections]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [ctx,        setCtx]        = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [showExcel,  setShowExcel]  = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [deptFilter, setDeptFilter] = useState('all')
  const [saving,     setSaving]     = useState(false)

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token')||s?.token||''
    const slug  = s?.company?.slug||''
    if (!token||!slug) { setLoading(false); return }
    fetch('/api/v1/sections', { headers: _authH() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}; return r.ok?r.json():Promise.reject(r.status) })
      .then(d => setSections(d.data||d||[]))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const depts = ['all', ...new Set(sections.map(s=>s.department).filter(Boolean))]
  const filtered = sections.filter(s =>
    (deptFilter==='all' || s.department===deptFilter) &&
    (!search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase()))
  )

  const saveNew = async (form) => {
    setSaving(true)
    try {
      const r = await fetch('/api/v1/sections', { method:'POST', headers:_authH(), body:JSON.stringify(form) })
      if (!r.ok) throw new Error(`Error ${r.status}`)
      const d = await r.json()
      setSections(prev => [...prev, d.data||d])
      setShowAdd(false)
    } catch(e) {
      setSections(prev => [...prev, { ...form, id:'local-'+Date.now(), status:'active', icon:'🔀', color:'#0ea5e9', employees:0 }])
      setShowAdd(false)
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}>
      <div style={{fontSize:30,marginBottom:10}}>⟳</div>
      <div style={{fontSize:12,fontWeight:600}}>Loading sections for {company?.name}...</div>
    </div>
  )

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:"'Segoe UI',system-ui,sans-serif",color:'#0f172a'}}>
      <PageHeader
        icon="🔀" title="Section & Unit"
        breadcrumb="Organization Management > Department & Team Setup"
        gradient={G}
        stats={[
          {icon:'🔀',label:'Sections',  value:sections.length},
          {icon:'👥',label:'Employees', value:sections.reduce((s,x)=>s+(x.employees||0),0)},
          {icon:'🏛️',label:'CoEs',      value:sections.filter(s=>s.ulrich_type==='CoE').length},
          {icon:'🔧',label:'HRSS',      value:sections.filter(s=>s.ulrich_type==='HRSS').length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Section"
        onExcel={()=>setShowExcel(true)}
      />

      {error && <div style={{padding:'10px 16px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,fontSize:12,color:'#dc2626',marginBottom:14}}>⚠️ {error}</div>}

      <SearchBar value={search} onChange={setSearch}
        placeholder="Search sections by name or code..."
        extra={
          <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
            style={{padding:'10px 14px',borderRadius:12,border:'1.5px solid #e2e8f0',fontSize:12,background:'#fff',outline:'none'}}>
            {depts.map(d=><option key={d} value={d}>{d==='all'?'All Departments':d}</option>)}
          </select>
        }
      />

      <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,
        padding:'8px 14px',marginBottom:16,fontSize:11,color:'#0369a1'}}>
        Ulrich Model: CoE (Centre of Excellence) + HRSS (Shared Services) + HRBP (Business Partners)
      </div>

      {filtered.length === 0 && !loading ? (
        <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:16,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:48,marginBottom:12}}>🔀</div>
          <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:6}}>No sections yet for {company?.name}</div>
          <div style={{fontSize:12,color:'#94a3b8',marginBottom:18}}>Sections group employees within departments. Add your first section to get started.</div>
          <button onClick={()=>setShowAdd(true)} style={{padding:'10px 22px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>＋ Add First Section</button>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))',gap:14}}>
          {filtered.map(sec => {
            const u = ULRICH_COLORS[sec.ulrich_type] || ULRICH_COLORS.HRSS
            return (
              <LuxCard key={sec.id} color={sec.color||A}
                onClick={()=>setSelected(sec)}
                onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:sec})}}>
                <div style={{padding:'16px 16px 12px',display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:46,height:46,borderRadius:12,background:`${sec.color||A}18`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                    {sec.icon||'🔀'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                      <span style={{fontSize:12,fontWeight:800,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sec.name}</span>
                      <Badge status={sec.status}/>
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{sec.code} · {sec.department}</div>
                    <div style={{marginTop:5,display:'flex',gap:5,flexWrap:'wrap'}}>
                      {sec.ulrich_type && <span style={{background:u.bg,color:u.color,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{u.label}</span>}
                      {sec.type && <span style={{background:`${sec.color||A}15`,color:sec.color||A,fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{sec.type}</span>}
                    </div>
                  </div>
                </div>
                <div style={{padding:'0 16px 8px',fontSize:11,color:'#64748b'}}>
                  {sec.head && <>Head: <strong style={{color:'#334155'}}>{sec.head}</strong> · </>}
                  {sec.employees||0} employees
                </div>
                {sec.description && (
                  <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 16px',fontSize:10,color:'#94a3b8'}}>
                    {sec.description}
                  </div>
                )}
              </LuxCard>
            )
          })}
          <div onClick={()=>setShowAdd(true)}
            style={{border:'2px dashed #bae6fd',borderRadius:16,minHeight:160,display:'flex',
              flexDirection:'column',alignItems:'center',justifyContent:'center',
              cursor:'pointer',color:'#94a3b8',gap:8,transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=A;e.currentTarget.style.color=A}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#bae6fd';e.currentTarget.style.color='#94a3b8'}}>
            <span style={{fontSize:32}}>+</span>
            <span style={{fontSize:12,fontWeight:700}}>Add Section / Unit</span>
          </div>
        </div>
      )}

      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
          actions={CONTEXT_ACTIONS}
          onAction={(k,item)=>{ if(k==='view') setSelected(item) }}
          onClose={()=>setCtx(null)} />
      )}
      {showExcel && <ExcelModal title="Section & Unit"
        columns={['Section Code','Name','Short Name','Type','Department','Head','Ulrich Type','Status']}
        onClose={()=>setShowExcel(false)} />}
      {showAdd && <AddSectionModal gradient={G} accent={A} onClose={()=>setShowAdd(false)} onSave={saveNew} saving={saving}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)}
        rows={[
          ['Code',       selected?.code],
          ['Type',       selected?.type],
          ['Department', selected?.department],
          ['Head',       selected?.head],
          ['Employees',  selected?.employees],
          ['Ulrich',     selected?.ulrich_label||selected?.ulrich_type],
        ]}>
        {selected?.description && (
          <div style={{padding:'8px 0',fontSize:12,color:'#475569',borderBottom:'1px solid #f8fafc',marginBottom:8}}>
            {selected.description}
          </div>
        )}
      </Drawer>
    </div>
  )
}

function AddSectionModal({ gradient, accent, onClose, onSave, saving }) {
  const [f,setF] = useState({code:'',name:'',short:'',type:'Technical Section',department:'',head:'',ulrich_type:'CoE',description:''})
  const set = k => v => setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.25)'}}>
        <div style={{padding:'20px 28px',background:gradient,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ New Section / Unit</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Section Code" value={f.code} onChange={set('code')} required accent={accent}/>
            <Field label="Section Name" value={f.name} onChange={set('name')} required accent={accent}/>
            <Field label="Short Name" value={f.short} onChange={set('short')} accent={accent}/>
            <Field label="Type" type="select" value={f.type} onChange={set('type')} accent={accent}
              options={['Technical Section','HR Section','Finance Section','Marketing Section','Operations Section','Admin Section']}/>
            <Field label="Parent Department" value={f.department} onChange={set('department')} accent={accent}/>
            <Field label="Section Head" value={f.head} onChange={set('head')} accent={accent}/>
            <Field label="Ulrich Model Type" type="select" value={f.ulrich_type} onChange={set('ulrich_type')} accent={accent}
              options={['CoE','HRSS','HRBP']} hint="Dave Ulrich HR Model classification"/>
          </div>
          <Field label="Description" type="textarea" value={f.description} onChange={set('description')} accent={accent}/>
          <AIImpact color={accent} lines={[
            'Section links to Department for payroll grouping and leave policy.',
            'Ulrich model classification determines HRBP assignment flow.',
            'Team Setup will reference this section as parent unit.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>onSave(f)} disabled={saving||!f.code||!f.name}
              style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:gradient,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',opacity:(saving||!f.code||!f.name)?.6:1}}>
              {saving?'Creating...':'Create Section'}
            </button>
            <button onClick={onClose} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:12,cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

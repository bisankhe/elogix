import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  THEMES, Field, ContextMenu, ExcelModal, PageHeader,
  AIImpact, Drawer, SearchBar, Badge, LuxCard
} from './DeptSetupShared.jsx'

const T = THEMES.section

  { id:'s1', code:'SEC-FE',  name:'Frontend Engineering',  short:'Frontend',    type:'Technical Section',
    department:'Information Technology', dept_code:'DEPT-IT', head:'Roshan Thapa',
    employees:24, status:'active', icon:'💻', color:'#0ea5e9',
    ulrich_type:'CoE', ulrich_label:'Centre of Excellence',
    impact_links:[{icon:'💰',module:'Payroll',desc:'Frontend team salary group'},{icon:'🎯',module:'Performance',desc:'Team OKRs'},{icon:'📅',module:'Leave',desc:'Team coverage policy'}],
  },
  { id:'s2', code:'SEC-BE',  name:'Backend Engineering',   short:'Backend',     type:'Technical Section',
    department:'Information Technology', dept_code:'DEPT-IT', head:'Anita Karki',
    employees:20, status:'active', icon:'Settings️', color:'#6366f1',
    ulrich_type:'CoE', ulrich_label:'Centre of Excellence',
    impact_links:[{icon:'💰',module:'Payroll',desc:'Backend team payroll'},{icon:'🔐',module:'IT Access',desc:'Server & DB access rights'}],
  },
  { id:'s3', code:'SEC-QA',  name:'Quality Assurance',     short:'QA',          type:'Technical Section',
    department:'Information Technology', dept_code:'DEPT-IT', head:'Dev Poudel',
    employees:12, status:'active', icon:'✅', color:'#10b981',
    ulrich_type:'HRSS', ulrich_label:'Shared Services',
    impact_links:[{icon:'🎯',module:'Performance',desc:'QA team KPIs'},{icon:'📊',module:'Reports',desc:'Bug metrics'}],
  },
  { id:'s4', code:'SEC-RECRUIT',name:'Talent Acquisition',  short:'Recruitment', type:'HR Section',
    department:'Human Resources', dept_code:'DEPT-HR', head:'Gita Lama',
    employees:6, status:'active', icon:'🎯', color:'#8b5cf6',
    ulrich_type:'CoE', ulrich_label:'Centre of Excellence',
    impact_links:[{icon:'📋',module:'Job Postings',desc:'Requisition approval flow'},{icon:'💰',module:'Payroll',desc:'Offer salary in band'},{icon:'🏛️',module:'Org Chart',desc:'Position fill tracking'}],
  },
  { id:'s5', code:'SEC-PAYROLL',name:'Payroll & Compensation',short:'Payroll',   type:'Finance Section',
    department:'Finance & Accounts', dept_code:'DEPT-FIN', head:'Hari KC',
    employees:5, status:'active', icon:'💳', color:'#f59e0b',
    ulrich_type:'HRSS', ulrich_label:'Shared Services',
    impact_links:[{icon:'💰',module:'Payroll Processing',desc:'Runs all payroll'},{icon:'⚖️',module:'IRD Filing',desc:'Tax submission'},{icon:'🏥',module:'SSF',desc:'Social security fund'}],
  },
  { id:'s6', code:'SEC-DIGIT',name:'Digital Marketing',      short:'Digital',    type:'Marketing Section',
    department:'Marketing', dept_code:'DEPT-MKT', head:'Priya Rai',
    employees:8, status:'active', icon:'📱', color:'#ec4899',
    ulrich_type:'HRBP', ulrich_label:'HR Business Partner',
    impact_links:[{icon:'💰',module:'Payroll',desc:'Marketing team salary'},{icon:'📊',module:'Budget',desc:'Campaign spend tracking'}],
  },
]

const CONTEXT_ACTIONS = [
  {icon:'👁️',label:'View Details',    key:'view'},
  {icon:'✏️',label:'Edit Section',   key:'edit'},
  {icon:'👥',label:'View Members',   key:'members'},
  {icon:'🎯',label:'View OKRs',      key:'okrs'},
  {icon:'📊',label:'Section Report', key:'report'},
  {icon:'🔗',label:'Linked Modules', key:'links'},
  {icon:'📤',label:'Export Excel',   key:'export'},
  {icon:'🗑️',label:'Deactivate',    key:'deactivate',danger:true},
]

const ULRICH_COLORS = {
  'CoE':  {bg:'#eef2ff',color:'#4f46e5',label:'Centre of Excellence'},
  'HRSS': {bg:'#f0fdf4',color:'#15803d',label:'HR Shared Services'},
  'HRBP': {bg:'#fffbeb',color:'#b45309',label:'HR Business Partner'},


import React, { useState, useEffect, useRef, useCallback } from 'react'

// ── Tenant-scoped data hook ─────────────────────────────────
function useTenantData(resourceKey) {
  const getAuth = () => {
    try { return JSON.parse(localStorage.getItem('elogix_auth') || '{}') } catch { return {} }
  const getCompanyId = () => {
    const auth = getAuth()
    return auth.company?.id || auth.company?.slug || auth.user?.company || 'demo'
  const getToken = () => {
    return localStorage.getItem('elogix_token') || getAuth().token || ''
  const storageKey = () => `elogix_${resourceKey}_${getCompanyId()}`

  const [items,   setItems]   = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [company, setCompany] = React.useState(null)

  React.useEffect(() => {
    // Load company info
    const auth = getAuth()
    const regCos = JSON.parse(localStorage.getItem('elogix_registered_companies') || '{}')
    const slug = auth.company?.slug || auth.user?.company || 'demo'
    setCompany({
      id: auth.company?.id || slug,
      name: auth.company?.name || regCos[slug]?.name || 'Your Company',
      slug, plan: auth.company?.plan || 'trial',
      country: auth.company?.country || 'Nepal',
      currency: auth.company?.currency || 'NPR',
      business_type: auth.company?.business_type || 'custom',
    })
    // Load data from API then localStorage fallback
    const load = async () => {
      try {
        const token = getToken()
        if (token) {
          const res = await fetch(`/api/v1/${resourceKey}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const d = await res.json()
            const data = d.data || d[resourceKey] || d.items || []
            setItems(Array.isArray(data) ? data : [])
            localStorage.setItem(storageKey(), JSON.stringify(data))
            setLoading(false); return
      } catch {}
      // Fallback: tenant-keyed localStorage
      const stored = JSON.parse(localStorage.getItem(storageKey()) || '[]')
      setItems(stored)
      setLoading(false)
    load()
  }, [])

  const saveItems = (newItems) => {
    setItems(newItems)
    localStorage.setItem(storageKey(), JSON.stringify(newItems))
    // Try API save
    const token = getToken()
    if (token) {
      fetch(`/api/v1/${resourceKey}/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(newItems)
      }).catch(() => {})

  const addItem = (item) => {
    const newItem = { ...item, id: item.id || `${resourceKey}-${Date.now()}`,
                     company_id: getCompanyId() }
    const updated = [...items, newItem]
    saveItems(updated)
    // POST to API
    const token = getToken()
    if (token) {
      fetch(`/api/v1/${resourceKey}`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(newItem)
      }).catch(() => {})
    return newItem

  const updateItem = (id, updates) => {
    const updated = items.map(i => i.id === id ? { ...i, ...updates } : i)
    saveItems(updated)

  const deleteItem = (id) => {
    const updated = items.filter(i => i.id !== id)
    saveItems(updated)

  return { items, loading, company, addItem, updateItem, deleteItem, setItems: saveItems }


// ── Tenant context ────────────────────────────────────────────
function useCompanyCtx() {
  const auth   = (() => { try { return JSON.parse(localStorage.getItem('elogix_auth')||'{}') } catch { return {} } })()
  const regCos = (() => { try { return JSON.parse(localStorage.getItem('elogix_registered_companies')||'{}') } catch { return {} } })()
  const slug   = auth.company?.slug || auth.user?.company || 'demo'
  return {
    company_id:   auth.company?.id || slug,
    company_name: auth.company?.name || regCos[slug]?.name || 'Your Company',
    company_slug: slug,
    plan:         auth.company?.plan || 'trial',
    currency:     auth.company?.currency || 'NPR',
    token:        localStorage.getItem('elogix_token') || auth.token || '',

export default function SectionUnitPage() {
  const ctx = useCompanyCtx()
  // ── Tenant context: only this company's data is shown ────────
  const companyName = company?.name || 'Your Company'
  const companySlug = company?.slug || ''

  const [sections,  setSections]  = useState(MOCK_SECTIONS)
  const [search,    setSearch]    = useState('')
  const [ctx,       setCtx]       = useState(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [deptFilter,setDeptFilter]= useState('all')

  const depts = ['all', ...new Set(sections.map(s=>s.department))]
  const filtered = sections.filter(s =>
    (deptFilter==='all' || s.department===deptFilter) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="🔀" title="Section & Unit"
        breadcrumb="Organization Management > Department & Team Setup"
        gradient={T.gradient}
        stats={[
          {icon:'🔀',label:'Sections',   value:sections.length},
          {icon:'👥',label:'Employees',  value:sections.reduce((s,x)=>s+x.employees,0)},
          {icon:'🏛️',label:'CoEs',       value:sections.filter(s=>s.ulrich_type==='CoE').length},
          {icon:'🔧',label:'HRSS',       value:sections.filter(s=>s.ulrich_type==='HRSS').length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Section"
        onExcel={()=>setShowExcel(true)}
      />

      <SearchBar value={search} onChange={setSearch}
        placeholder="Search sections by name or code..."
        extra={
          <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
            style={{padding:'10px 14px',borderRadius:12,border:'1.5px solid #e2e8f0',fontSize:12,background:'#fff',cursor:'pointer',outline:'none'}}>
            {depts.map(d=><option key={d} value={d}>{d==='all'?'All Departments':d}</option>)}
          </select>
      />

      <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,
        padding:'8px 14px',marginBottom:16,fontSize:11,color:'#0369a1'}}>
        Ulrich Model: CoE (Centre of Excellence) + HRSS (Shared Services) + HRBP (Business Partners) &mdash; Right-click for SAP impact links
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))',gap:14}}>
        {filtered.map(sec => {
          const u = ULRICH_COLORS[sec.ulrich_type] || ULRICH_COLORS.HRSS
          return (
            <LuxCard key={sec.id} color={sec.color}
              onClick={()=>setSelected(sec)}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:sec})}}>
              <div style={{padding:'16px 16px 12px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:46,height:46,borderRadius:12,background:`${sec.color}18`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                  {sec.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a',
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sec.name}</span>
                    <Badge status={sec.status}/>
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{sec.code} &bull; {sec.department}</div>
                  <div style={{marginTop:5,display:'flex',gap:5,flexWrap:'wrap'}}>
                    <span style={{background:u.bg,color:u.color,fontSize:9,fontWeight:700,
                      padding:'2px 8px',borderRadius:20}}>{u.label}</span>
                    <span style={{background:`${sec.color}15`,color:sec.color,fontSize:9,
                      fontWeight:600,padding:'2px 8px',borderRadius:20}}>{sec.type}</span>
                  </div>
                </div>
              </div>
              <div style={{padding:'0 16px 8px',fontSize:11,color:'#64748b'}}>
                Head: <strong style={{color:'#334155'}}>{sec.head}</strong>
                &nbsp;&bull; {sec.employees} employees
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 16px',fontSize:10,color:'#94a3b8'}}>
                {sec.description}
              </div>
            </LuxCard>
          )
        })}
        <div onClick={()=>setShowAdd(true)}
          style={{border:'2px dashed #bae6fd',borderRadius:16,minHeight:160,display:'flex',
            flexDirection:'column',alignItems:'center',justifyContent:'center',
            cursor:'pointer',color:'#94a3b8',gap:8,transition:'all .2s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#0ea5e9';e.currentTarget.style.color='#0ea5e9'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#bae6fd';e.currentTarget.style.color='#94a3b8'}}>
          <span style={{fontSize:32}}>+</span>
          <span style={{fontSize:12,fontWeight:700}}>Add Section / Unit</span>
        </div>
      </div>

      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
          impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
          actions={CONTEXT_ACTIONS}
          onAction={(k,item)=>{if(k==='view') setSelected(item)}}
          onClose={()=>setCtx(null)} />
      )}
      {showExcel && <ExcelModal title="Section & Unit"
        columns={['Section Code','Name','Short Name','Type','Department','Head','Ulrich Type','Status']}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Processing: '+f.name)} />}
      {showAdd && <AddSectionModal T={T} onClose={()=>setShowAdd(false)}
        onSave={sec=>setSections(p=>[...p,{...sec,id:'s'+Date.now(),status:'active',icon:'🔀',color:'#0ea5e9',employees:0,impact_links:[]}])} />}
      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Code',       selected?.code],
          ['Type',       selected?.type],
          ['Department', selected?.department],
          ['Head',       selected?.head],
          ['Employees',  selected?.employees],
          ['Ulrich',     selected?.ulrich_label],
        ]}>
        {selected?.description && (
          <div style={{padding:'8px 0',fontSize:12,color:'#475569',borderBottom:'1px solid #f8fafc'}}>
            {selected.description}
          </div>
        )}
      </Drawer>
    </div>
  )

function AddSectionModal({ T, onClose, onSave }) {
  const [f,setF] = useState({code:'',name:'',short:'',type:'Technical Section',department:'',head:'',ulrich_type:'CoE',description:''})
  const s = k => v => setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 28px',background:T.gradient,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ New Section / Unit</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Section Code" value={f.code} onChange={s('code')} required accent={T.accent}/>
            <Field label="Section Name" value={f.name} onChange={s('name')} required accent={T.accent}/>
            <Field label="Short Name" value={f.short} onChange={s('short')} accent={T.accent}/>
            <Field label="Type" type="select" value={f.type} onChange={s('type')} accent={T.accent}
              options={['Technical Section','HR Section','Finance Section','Marketing Section','Operations Section','Sales Section','Legal Section']}/>
            <Field label="Parent Department" type="select" value={f.department} onChange={s('department')} accent={T.accent}
              options={['Information Technology','Human Resources','Finance & Accounts','Sales','Marketing','Legal','Operations']}/>
            <Field label="Section Head" value={f.head} onChange={s('head')} accent={T.accent}/>
            <Field label="Ulrich Model Type" type="select" value={f.ulrich_type} onChange={s('ulrich_type')} accent={T.accent}
              options={['CoE','HRSS','HRBP']} hint="Dave Ulrich HR Model classification"/>
          </div>
          <Field label="Description" type="textarea" value={f.description} onChange={s('description')} accent={T.accent}/>
          <AIImpact color={T.accent} lines={[
            'Section links to Department for payroll grouping and leave policy.',
            'Ulrich model classification determines HRBP assignment flow.',
            'Team Setup will reference this section as parent unit.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}}
              style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:T.gradient,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Create Section
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

// FILE: TeamSetupPage.jsx — Team / Organizational Unit Setup
// eLogix HRMS · Nepal Labour Act 2074 Compliant
// eLogix Technologies · www.elogix.com.np

import React, { useState, useEffect } from 'react'
import { PageHeader, SearchBar, LuxCard, Badge, Drawer, Field, ExcelModal, AIImpact } from './DeptSetupShared.jsx'

// ── Helpers ────────────────────────────────────────────────────
function _getSession(){
  try{
    return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')
  }catch(_e){return null}
}
function _getTenantCtx(){
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

// ── Mock Data ──────────────────────────────────────────────────
const MOCK_TEAMS = [
  {id:'t1',code:'TM-IT',name:'IT Development',dept:'Information Technology',
   lead:'Hari Prasad Shrestha',emp_count:18,active:true,
   tags:['Engineering','Backend','Frontend'],
   icon:'💻',color:'#3b82f6'},
  {id:'t2',code:'TM-HR',name:'HR Operations',dept:'Human Resources',
   lead:'Sita Kumari Karki',emp_count:8,active:true,
   tags:['Recruitment','Payroll','Compliance'],
   icon:'👥',color:'#10b981'},
  {id:'t3',code:'TM-FIN',name:'Finance & Accounts',dept:'Finance',
   lead:'Ram Bahadur Thapa',emp_count:12,active:true,
   tags:['Accounting','Audit','Tax'],
   icon:'💰',color:'#f59e0b'},
  {id:'t4',code:'TM-SAL',name:'Sales & Marketing',dept:'Sales',
   lead:'Gita Rai',emp_count:22,active:true,
   tags:['B2B','Digital','Brand'],
   icon:'📈',color:'#8b5cf6'},
  {id:'t5',code:'TM-OPS',name:'Operations',dept:'Operations',
   lead:'Bikram Limbu',emp_count:15,active:true,
   tags:['Logistics','Support','Facilities'],
   icon:'⚙️',color:'#ef4444'},
]

const FIELDS = [
  {key:'name',      label:'Team Name',        type:'text',  required:true},
  {key:'code',      label:'Team Code',        type:'text',  required:true},
  {key:'dept',      label:'Department',       type:'text',  required:true},
  {key:'lead',      label:'Team Lead',        type:'text',  required:false},
]

// ── Component ──────────────────────────────────────────────────
export default function TeamSetupPage() {
  const [teams,     setTeams]     = useState(MOCK_TEAMS)
  const [apiTeams,  setApiTeams]  = useState(null)
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(null)
  const [drawerOpen,setDrawerOpen]= useState(false)
  const [form,      setForm]      = useState({})
  const [saving,    setSaving]    = useState(false)
  const [apiError,  setApiError]  = useState(null)

  useEffect(()=>{
    const {token,slug,valid}=_getTenantCtx()
    if(!valid) return
    fetch('/api/v1/teams',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug}})
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d?.teams) setApiTeams(d.teams) })
      .catch(()=>{})
  },[])

  const displayTeams = (apiTeams || teams).filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase()) ||
    t.dept?.toLowerCase().includes(search.toLowerCase())
  )

  const openDrawer = (team=null) => {
    setForm(team ? {...team} : {active:true})
    setSelected(team)
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!form.name?.trim() || !form.code?.trim()) return
    setSaving(true)
    try {
      const {token,slug,valid}=_getTenantCtx()
      if (valid) {
        const method = selected ? 'PUT' : 'POST'
        const url = selected ? `/api/v1/teams/${selected.id}` : '/api/v1/teams'
        await fetch(url,{method,headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'},body:JSON.stringify(form)})
      }
      if (selected) {
        setTeams(t=>t.map(x=>x.id===selected.id?{...x,...form}:x))
        if (apiTeams) setApiTeams(t=>t.map(x=>x.id===selected.id?{...x,...form}:x))
      } else {
        const newTeam={...form,id:'t'+Date.now(),icon:'👤',color:'#64748b',emp_count:0,active:true}
        setTeams(t=>[newTeam,...t])
        if (apiTeams) setApiTeams(t=>[newTeam,...t])
      }
      setDrawerOpen(false)
    } catch(e){ setApiError(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <PageHeader
        title="Team Setup"
        sub={`${displayTeams.length} teams across your organization`}
        badge="Teams"
        gradient="linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%)"
        actions={[
          {label:'+ New Team', primary:true, onClick:()=>openDrawer()},
          {label:'📥 Import',  primary:false, onClick:()=>{}},
        ]}
      />

      {apiError && (
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',
          fontSize:12,color:'#dc2626',marginBottom:16}}>⚠️ {apiError}</div>
      )}

      <SearchBar value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search teams..." />

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16,marginTop:16}}>
        {displayTeams.map(team=>(
          <LuxCard key={team.id} style={{cursor:'pointer'}} onClick={()=>openDrawer(team)}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:team.color+'22',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
                border:`1px solid ${team.color}44`}}>
                {team.icon||'👤'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{team.name}</span>
                  <Badge color={team.active?'green':'gray'}>{team.active?'Active':'Inactive'}</Badge>
                </div>
                <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{team.code} · {team.dept}</div>
                <div style={{fontSize:11,color:'#475569',marginTop:3}}>
                  👤 {team.lead||'—'} · {team.emp_count||0} members
                </div>
              </div>
            </div>
            {team.tags?.length > 0 && (
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:10}}>
                {team.tags.map(tag=>(
                  <span key={tag} style={{fontSize:10,padding:'2px 8px',borderRadius:99,
                    background:'#f1f5f9',color:'#475569',fontWeight:600}}>{tag}</span>
                ))}
              </div>
            )}
          </LuxCard>
        ))}

        {displayTeams.length === 0 && (
          <div style={{gridColumn:'1/-1',textAlign:'center',padding:'48px 0',color:'#94a3b8',fontSize:14}}>
            No teams found. <span style={{color:'#0369a1',cursor:'pointer',fontWeight:700}}
              onClick={()=>openDrawer()}>+ Add your first team</span>
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)}
        title={selected ? `Edit Team — ${selected.name}` : 'Add New Team'}>
        {FIELDS.map(f=>(
          <Field key={f.key} label={f.label+( f.required?' *':'')} type={f.type}
            value={form[f.key]||''}
            onChange={e=>setForm(v=>({...v,[f.key]:e.target.value}))}/>
        ))}
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button onClick={handleSave} disabled={saving}
            style={{flex:1,padding:'11px',borderRadius:9,border:'none',
              background:saving?'#94a3b8':'linear-gradient(135deg,#0369a1,#0ea5e9)',
              color:'#fff',fontWeight:700,cursor:saving?'not-allowed':'pointer',fontSize:13}}>
            {saving?'⟳ Saving…':selected?'💾 Update Team':'➕ Create Team'}
          </button>
          <button onClick={()=>setDrawerOpen(false)}
            style={{padding:'11px 18px',borderRadius:9,border:'1px solid #e2e8f0',
              background:'#fff',cursor:'pointer',fontSize:13,color:'#374151'}}>
            Cancel
          </button>
        </div>
        {selected && (
          <AIImpact links={[
            {icon:'👥',module:'People',desc:'Team members will see team grouping in their profile'},
            {icon:'📊',module:'Reports',desc:'Team-level analytics and headcount reporting'},
            {icon:'🎯',module:'Performance',desc:'Team OKRs and group performance reviews'},
          ]}/>
        )}
      </Drawer>
    </div>
  )
}

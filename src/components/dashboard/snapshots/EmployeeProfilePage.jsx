// FILE: EmployeeProfilePage.jsx - Employee Profile (Employee Database)
// Tabbed "single source of truth" hub linking to all 7 Employee Database sub-pages

import { useState } from 'react'
import { PageHeader, Badge, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const PROFILE = {
  code:'EMP-0041', name:'Gita Maharjan', position:'Cloud Architect', dept:'Information Technology',
  branch:'KTM HQ', manager:'Rajesh Sharma (CTO)', email:'gita.m@elogix.com.np', phone:'980-1111111',
  status:'active', join_date:'2025-06-16', tenure:'2 weeks', employment_type:'Regular',
  quick_stats:[
    {label:'Personal Info',icon:'👤',complete:true,link:'personal-information'},
    {label:'Family Details',icon:'👨‍👩‍👧',complete:true,link:'family-details'},
    {label:'Emergency Contact',icon:'🆘',complete:true,link:'emergency-contact'},
    {label:'Assets Assigned',icon:'💼',complete:true,link:'employee-assets',count:3},
    {label:'Employment History',icon:'📜',complete:true,link:'employment-history',count:1},
  ],

const TABS = ['Overview','Personal','Family','Emergency','Assets','History']

export default function EmployeeProfilePage() {
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [tab, setTab] = useState('Overview')
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="👤" title="Employee Profile"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Database"
        gradient={G}
        stats={[
          {icon:'📇',label:'Employee Code', value:PROFILE.code},
          {icon:'🏢',label:'Department',     value:PROFILE.dept.split(' ')[0]},
          {icon:'📅',label:'Tenure',         value:PROFILE.tenure},
          {icon:'✅',label:'Status',         value:PROFILE.status},
        ]}
        onAdd={()=>notify('👤 Navigate to Employee Enrollment to create new profile')} addLabel="+ New Profile" onExcel={()=>notify('📤 Exporting employee profiles...')}/>

      {/* Profile hero card */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,overflow:'hidden',marginBottom:16,boxShadow:'0 2px 12px rgba(0,0,0,.05)'}}>
        <div style={{background:G,padding:'24px 28px',display:'flex',gap:18,alignItems:'center'}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:900,color:'#fff',flexShrink:0,border:'3px solid rgba(255,255,255,.4)'}}>
            {PROFILE.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>{PROFILE.name}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,.8)'}}>{PROFILE.position} . {PROFILE.dept}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.65)',marginTop:4}}>{PROFILE.code} . {PROFILE.branch} . Reports to {PROFILE.manager}</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={{padding:'9px 18px',borderRadius:10,border:'none',background:'rgba(255,255,255,.2)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>✏ Edit Profile</button>
            <button style={{padding:'9px 18px',borderRadius:10,border:'none',background:'rgba(255,255,255,.2)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>💬 Message</button>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{display:'flex',gap:2,padding:'0 24px',borderBottom:'1px solid #f1f5f9',overflowX:'auto'}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{padding:'14px 18px',border:'none',background:'none',cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap',
                color:tab===t?A:'#94a3b8',borderBottom:tab===t?`2.5px solid ${A}`:'2.5px solid transparent'}}>
              {t}
            </button>
          ))}
        </div>

        {tab==='Overview' && (
          <div style={{padding:'22px 28px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:20}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:10}}>Contact</div>
                {[['Email',PROFILE.email],['Phone',PROFILE.phone],['Employment Type',PROFILE.employment_type],['Join Date',PROFILE.join_date]].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f8fafc',fontSize:11}}>
                    <span style={{color:'#64748b'}}>{l}</span><span style={{color:'#0f172a',fontWeight:600}}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:10}}>Reporting</div>
                {[['Manager',PROFILE.manager],['Department',PROFILE.dept],['Branch',PROFILE.branch],['Status',PROFILE.status]].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f8fafc',fontSize:11}}>
                    <span style={{color:'#64748b'}}>{l}</span><span style={{color:'#0f172a',fontWeight:600,textTransform:'capitalize'}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:10}}>Profile Completeness</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
              {PROFILE.quick_stats.map((s,i)=>(
                <div key={i} style={{background:'#f8fafc',borderRadius:12,padding:'12px 14px',border:`1px solid ${s.complete?'#bbf7d0':'#fecaca'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:16}}>{s.icon}</span>
                    <span style={{color:s.complete?'#10b981':'#ef4444',fontSize:12,fontWeight:700}}>{s.complete?'✓':'!'}</span>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginTop:6}}>{s.label}</div>
                  {s.count&&<div style={{fontSize:9,color:'#94a3b8'}}>{s.count} record(s)</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab!=='Overview' && (
          <div style={{padding:'40px 28px',textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:32,marginBottom:10}}>{PROFILE.quick_stats.find(s=>s.label.includes(tab))?.icon||'📋'}</div>
            <div style={{fontSize:13}}>Navigate to the <strong>{tab}</strong> page from the sidebar for full detail and editing.</div>
          </div>
        )}
      </div>
    </div>
  )

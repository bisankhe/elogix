
import { useState, useEffect } from 'react'
import { PageHeader, SearchBar, ExcelModal } from './DeptSetupShared.jsx'

function _s(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch(_e){return{}}}
const G='linear-gradient(135deg,#064e3b 0%,#059669 60%,#6ee7b7 100%)'
const A='#059669'
const STATUS_C={'Pre-joining':'#94a3b8','Day 1':'#3b82f6','Week 2':'#f59e0b','Week 3':'#8b5cf6','Onboarding':'#10b981'}
const EMP_C={Permanent:'#059669',Contract:'#0891b2',Outsource:'#f59e0b',Probation:'#f97316'}

export default function OnboardingMonthPage() {
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(null)
  const [search,setSearch]=useState('');const [showExcel,setShowExcel]=useState(false)
  const s=_s();const company=s?.company||{}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/onboarding/month',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>setData(d.data||d)).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])

  const employees = (data?.employees||[]).filter(e=>!search||e.name?.toLowerCase().includes(search.toLowerCase())||e.department?.toLowerCase().includes(search.toLowerCase()))
  const byStage   = data?.by_stage||[]

  if(loading) return <div style={{textAlign:'center',padding:60,color:A,fontSize:13,fontWeight:600}}>⟳ Loading onboarding data for {company?.name}...</div>
  if(error)   return <div style={{padding:20,background:'#fef2f2',borderRadius:12,color:'#dc2626',fontSize:13,margin:20}}>⚠️ {error}</div>
  if(!data)   return <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>🎯</div><div>No onboarding data for {company?.name} this month</div></div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(5,150,105,.25)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>🎯 Onboarding This Month</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>{company?.name} · {data?.total||0} new joiners</div>
        </div>
        <button onClick={()=>setShowExcel(true)} style={{padding:'7px 16px',borderRadius:8,border:'1.5px solid rgba(255,255,255,.5)',background:'transparent',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>📊 Export</button>
      </div>

      {/* Stage summary */}
      {byStage.length>0&&(
        <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
          {byStage.map((st,i)=>(
            <div key={i} style={{flex:1,minWidth:120,background:'#fff',borderRadius:10,padding:'10px 14px',border:`1.5px solid ${STATUS_C[st.stage]||A}30`,textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:900,color:STATUS_C[st.stage]||A}}>{st.count}</div>
              <div style={{fontSize:10,color:'#64748b',marginTop:3}}>{st.stage}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or department..."
          style={{padding:'8px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:12,outline:'none',width:'100%',maxWidth:300,boxSizing:'border-box'}}/>
      </div>

      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc'}}>
            {['Name','Designation','Department','Joining Date','Stage','Type'].map(h=>(
              <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {employees.length===0&&<tr><td colSpan={6} style={{padding:32,textAlign:'center',color:'#94a3b8'}}>No onboarding records found</td></tr>}
            {employees.map((e,i)=>(
              <tr key={e.id||i} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:600}}>{e.name}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'#475569'}}>{e.designation}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'#475569'}}>{e.department}</td>
                <td style={{padding:'10px 14px',fontSize:12}}>{e.joining_date}</td>
                <td style={{padding:'10px 14px'}}>
                  <span style={{padding:'2px 10px',borderRadius:20,fontSize:9,fontWeight:700,
                    background:(STATUS_C[e.stage]||A)+'15',color:STATUS_C[e.stage]||A}}>
                    {e.stage}
                  </span>
                </td>
                <td style={{padding:'10px 14px'}}>
                  <span style={{padding:'2px 10px',borderRadius:20,fontSize:9,fontWeight:700,
                    background:(EMP_C[e.employment_type]||'#64748b')+'15',color:EMP_C[e.employment_type]||'#64748b'}}>
                    {e.employment_type}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ExcelModal open={showExcel} onClose={()=>setShowExcel(false)} title="Onboarding This Month"/>
    </div>
  )
}


import { useState, useEffect } from 'react'

function _s(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch(_e){return{}}}
const G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const RISK_C={critical:'#ef4444',warning:'#f59e0b',normal:'#10b981'}
const RISK_BG={critical:'#fef2f2',warning:'#fffbeb',normal:'#f0fdf4'}

export default function ContractExpiryPage() {
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(null)
  const [search,setSearch]=useState('');const [filter,setFilter]=useState('all')
  const s=_s();const company=s?.company||{}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/employees/contract-expiry',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>setData(d.data||d)).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])

  const contracts = data?.contracts || []
  const summary   = data?.summary   || {}
  const filtered  = contracts.filter(c=>{
    if(filter!=='all'&&c.risk!==filter) return false
    if(search&&!c.name?.toLowerCase().includes(search.toLowerCase())&&!c.dept?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if(loading) return <div style={{textAlign:'center',padding:60,color:'#7c3aed',fontSize:13,fontWeight:600}}>⟳ Loading contract data...</div>
  if(error)   return <div style={{padding:20,background:'#fef2f2',borderRadius:12,color:'#dc2626',fontSize:13,margin:20}}>⚠️ {error}</div>
  if(!data)   return <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>📄</div><div>No contract data yet for {company?.name}</div></div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📄 Contract Expiry Tracker</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>{company?.name} · {contracts.length} contracts expiring</div>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
        {[['critical','🔴','Critical (≤7 days)'],['warning','🟡','Warning (≤30 days)'],['normal','🟢','Normal (≤90 days)']].map(([k,icon,label])=>(
          <div key={k} style={{background:RISK_BG[k],borderRadius:12,padding:16,border:`1.5px solid ${RISK_C[k]}30`,cursor:'pointer'}}
            onClick={()=>setFilter(filter===k?'all':k)}>
            <div style={{fontSize:28,fontWeight:900,color:RISK_C[k]}}>{icon} {summary[k]||0}</div>
            <div style={{fontSize:11,color:'#64748b',marginTop:4}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or dept..."
          style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:12,outline:'none',flex:1,maxWidth:260}}/>
        {['all','critical','warning','normal'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${filter===f?RISK_C[f]||'#7c3aed':'#e2e8f0'}`,
              background:filter===f?(RISK_C[f]||'#7c3aed')+'15':'#fff',
              color:filter===f?(RISK_C[f]||'#7c3aed'):'#64748b',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc'}}>
            {['Name','Department','Role','Expiry Date','Days Left','Risk','Action'].map(h=>(
              <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'#94a3b8'}}>No contracts found</td></tr>}
            {filtered.map((c,i)=>(
              <tr key={c.id||i} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:600}}>{c.name}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'#64748b'}}>{c.dept}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'#64748b'}}>{c.role||c.position}</td>
                <td style={{padding:'10px 14px',fontSize:12}}>{c.end_date}</td>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:RISK_C[c.risk]||'#10b981'}}>{c.days_left}d</td>
                <td style={{padding:'10px 14px'}}>
                  <span style={{padding:'2px 10px',borderRadius:20,fontSize:9,fontWeight:700,
                    background:RISK_BG[c.risk],color:RISK_C[c.risk],border:`1px solid ${RISK_C[c.risk]}30`}}>
                    {c.risk?.toUpperCase()}
                  </span>
                </td>
                <td style={{padding:'10px 14px'}}>
                  <button style={{padding:'4px 12px',borderRadius:7,border:'none',background:'#7c3aed',
                    color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>
                    Renew
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

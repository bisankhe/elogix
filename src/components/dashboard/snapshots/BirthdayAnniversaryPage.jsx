
import { useState, useEffect } from 'react'

function _s(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch(_e){return{}}}
const G='linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#c4b5fd 100%)'

export default function BirthdayAnniversaryPage() {
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(null)
  const [tab,setTab]=useState('birthdays');const [wished,setWished]=useState({})
  const s=_s();const company=s?.company||{}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/employees/birthdays-anniversaries',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>setData(d.data||d)).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])

  const birthdays     = data?.birthdays     || []
  const anniversaries = data?.anniversaries || []
  const list          = tab==='birthdays' ? birthdays : anniversaries

  function wish(person) {
    setWished(w=>({...w,[person.name]:true}))
    const msg = tab==='birthdays'
      ? `🎂 Happy Birthday, ${person.name}!\n\nWishing you a wonderful day filled with joy!\n\n— ${company?.name}`
      : `🥂 Happy Work Anniversary, ${person.name}!\n\nThank you for your dedication!\n\n— ${company?.name}`
    if(navigator.share) navigator.share({title:'eLogix Wishes',text:msg}).catch(()=>{})
    else { navigator.clipboard?.writeText(msg); alert('Wish message copied to clipboard!') }
  }

  if(loading) return <div style={{textAlign:'center',padding:60,color:'#7c3aed',fontSize:13,fontWeight:600}}>⟳ Loading birthday & anniversary data...</div>
  if(error)   return <div style={{padding:20,background:'#fef2f2',borderRadius:12,color:'#dc2626',fontSize:13,margin:20}}>⚠️ {error}</div>
  if(!data)   return <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>🎂</div><div>No upcoming birthdays or anniversaries for {company?.name}</div></div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>🎂 Birthdays & Anniversaries</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>{company?.name} · {birthdays.length} birthdays · {anniversaries.length} anniversaries upcoming</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[['birthdays','🎂',birthdays.length],['anniversaries','🥂',anniversaries.length]].map(([t,icon,count])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:'8px 20px',borderRadius:20,border:`1.5px solid ${tab===t?'#7c3aed':'#e2e8f0'}`,
              background:tab===t?'#7c3aed':'#fff',color:tab===t?'#fff':'#64748b',
              fontSize:12,fontWeight:700,cursor:'pointer'}}>
            {icon} {t.charAt(0).toUpperCase()+t.slice(1)} ({count})
          </button>
        ))}
      </div>

      {list.length===0&&<div style={{textAlign:'center',padding:40,color:'#94a3b8',fontSize:13}}>No upcoming {tab} in the next 30 days</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
        {list.map((p,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:14,padding:'16px 18px',border:'1.5px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.06)',display:'flex',gap:14,alignItems:'center'}}>
            <div style={{width:44,height:44,borderRadius:'50%',flexShrink:0,
              background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
              display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,fontWeight:800}}>
              {(p.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{p.name}</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{p.department} · {tab==='birthdays'?`Age ${p.age}`:p.years+' yrs service'}</div>
              <div style={{fontSize:12,fontWeight:700,color:'#7c3aed',marginTop:4}}>{tab==='birthdays'?'🎂':'🥂'} {p.date_str}</div>
            </div>
            <button onClick={()=>wish(p)} disabled={wished[p.name]}
              style={{padding:'6px 12px',borderRadius:8,border:'none',
                background:wished[p.name]?'#f0fdf4':'#7c3aed',
                color:wished[p.name]?'#059669':'#fff',
                fontSize:10,fontWeight:700,cursor:wished[p.name]?'default':'pointer',whiteSpace:'nowrap'}}>
              {wished[p.name]?'✅ Wished':'🎉 Wish'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

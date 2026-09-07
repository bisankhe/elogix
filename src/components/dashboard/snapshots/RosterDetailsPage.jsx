
import { useState, useEffect } from 'react'

function _s(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch(_e){return{}}}
const G='linear-gradient(135deg,#1e3a5f 0%,#0891b2 60%,#38bdf8 100%)'
const SHIFT_C={Morning:'#f59e0b',Afternoon:'#3b82f6',Night:'#7c3aed',Regular:'#10b981',Off:'#e2e8f0',Rest:'#f1f5f9'}
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function RosterDetailsPage() {
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(null)
  const s=_s();const company=s?.company||{}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/roster/details',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>setData(d.data||d)).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])

  const roster     = data?.roster     || []
  const shifts     = data?.shifts     || []
  const weekStart  = data?.week_start || ''

  // Group roster by dept
  const byDept = roster.reduce((acc,r)=>{
    if(!acc[r.dept]) acc[r.dept]=[]
    acc[r.dept].push(r)
    return acc
  },{})

  if(loading) return <div style={{textAlign:'center',padding:60,color:'#0891b2',fontSize:13,fontWeight:600}}>⟳ Loading roster data...</div>
  if(error)   return <div style={{padding:20,background:'#fef2f2',borderRadius:12,color:'#dc2626',fontSize:13,margin:20}}>⚠️ {error}</div>
  if(!data)   return <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div>No roster data yet for {company?.name}</div></div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(8,145,178,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📋 Roster Details</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>{company?.name} · Week of {weekStart}</div>
      </div>

      {/* Shift legend */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {Object.entries(SHIFT_C).map(([shift,color])=>(
          <span key={shift} style={{padding:'4px 12px',borderRadius:20,fontSize:10,fontWeight:700,background:color+'20',color:color==='#e2e8f0'?'#94a3b8':color,border:`1px solid ${color}`}}>{shift}</span>
        ))}
      </div>

      {/* Roster by department */}
      {Object.entries(byDept).map(([dept,staff])=>(
        <div key={dept} style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',marginBottom:16,overflow:'hidden'}}>
          <div style={{padding:'10px 16px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',fontWeight:800,fontSize:13,color:'#0f172a'}}>
            {dept} <span style={{fontSize:10,fontWeight:500,color:'#64748b',marginLeft:8}}>{staff.length} employees</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
              <thead><tr style={{background:'#f8fafc'}}>
                <th style={{padding:'8px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',whiteSpace:'nowrap'}}>Employee</th>
                {DAYS.map(d=><th key={d} style={{padding:'8px 10px',textAlign:'center',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>{d}</th>)}
              </tr></thead>
              <tbody>
                {staff.map((emp,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{padding:'8px 14px',fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}>{emp.name||emp.full_name}</td>
                    <td colSpan={7} style={{padding:'8px 10px'}}>
                      <div style={{display:'flex',gap:4}}>
                        {DAYS.map((d,di)=>{
                          const shift=emp.shift||'Regular'
                          const color=SHIFT_C[shift]||'#10b981'
                          return <span key={di} style={{flex:1,textAlign:'center',padding:'3px 0',borderRadius:6,fontSize:9,fontWeight:700,background:color+'20',color:color==='#e2e8f0'?'#94a3b8':color}}>{shift}</span>
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {Object.keys(byDept).length===0&&(
        <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>No roster assignments for this week</div>
      )}
    </div>
  )
}

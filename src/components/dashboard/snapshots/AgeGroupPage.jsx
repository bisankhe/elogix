
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function _s(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch(_e){return{}}}
const G='linear-gradient(135deg,#065f46 0%,#059669 60%,#6ee7b7 100%)'
const A='#059669'

export default function AgeGroupPage() {
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(null)
  const s=_s(); const company=s?.company||{}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/employees/age-groups',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>setData(d.data||d)).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])

  const groups  = data?.groups  || []
  const avgAge  = data?.avg_age || 0
  const total   = groups.reduce((s,g)=>s+(g.value||g.count||0),0)
  const COLORS  = ['#f59e0b','#3b82f6','#8b5cf6','#10b981','#f97316','#ef4444','#0ea5e9']

  if(loading) return <div style={{textAlign:'center',padding:60,color:A,fontSize:13,fontWeight:600}}>⟳ Loading age group data...</div>
  if(error)   return <div style={{padding:20,background:'#fef2f2',borderRadius:12,color:'#dc2626',fontSize:13,margin:20}}>⚠️ {error}</div>
  if(!data)   return <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>📊</div><div>No age data yet for {company?.name}</div></div>

  const chartData = groups.map((g,i)=>({...g, range: g.group||g.range, count: g.value||g.count, color: COLORS[i%COLORS.length]}))

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(5,150,105,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📊 Age Group Distribution</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>{company?.name} · Total: {total} · Avg Age: {avgAge} yrs</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Bar chart */}
        <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:13,fontWeight:800,marginBottom:14,color:'#0f172a'}}>Distribution by Age Group</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{top:4,right:8,bottom:8,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="range" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/>
              <Tooltip formatter={(v)=>[v,'Employees']}/>
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {chartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc'}}>
              <th style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>Age Group</th>
              <th style={{padding:'10px 14px',textAlign:'right',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>Count</th>
              <th style={{padding:'10px 14px',textAlign:'right',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>%</th>
            </tr></thead>
            <tbody>
              {chartData.map((g,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'10px 14px',fontSize:13}}>
                    <span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:g.color,marginRight:8}}/>
                    {g.range}
                  </td>
                  <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,textAlign:'right',color:g.color}}>{g.count}</td>
                  <td style={{padding:'10px 14px',fontSize:12,textAlign:'right',color:'#64748b'}}>{total?((g.count/total)*100).toFixed(1):0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

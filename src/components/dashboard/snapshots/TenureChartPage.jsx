
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function _s(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch(_e){return{}}}
const G='linear-gradient(135deg,#1e3a5f 0%,#1e40af 60%,#60a5fa 100%)'
const COLORS=['#f59e0b','#3b82f6','#8b5cf6','#10b981','#ef4444']

export default function TenureChartPage() {
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState(null)
  const s=_s();const company=s?.company||{}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/employees/tenure',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>setData(d.data||d)).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])

  const buckets   = data?.buckets   || []
  const employees = data?.employees || []
  const avgTenure = data?.avg_tenure || 0
  const total     = buckets.reduce((s,b)=>s+(b.count||0),0)

  if(loading) return <div style={{textAlign:'center',padding:60,color:'#1e40af',fontSize:13,fontWeight:600}}>⟳ Loading tenure data...</div>
  if(error)   return <div style={{padding:20,background:'#fef2f2',borderRadius:12,color:'#dc2626',fontSize:13,margin:20}}>⚠️ {error}</div>
  if(!data)   return <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>📈</div><div>No tenure data yet for {company?.name}</div></div>

  const chartData = buckets.map((b,i)=>({...b,color:COLORS[i%COLORS.length]}))

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(30,64,175,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📈 Tenure Analysis</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:4}}>{company?.name} · {total} employees · Avg tenure: {avgTenure} yrs</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:13,fontWeight:800,marginBottom:14}}>Tenure Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{top:4,right:8,bottom:8,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="bucket" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/>
              <Tooltip/>
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {chartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Bucket','Count','%'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {chartData.map((b,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'10px 14px',fontSize:13}}><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:b.color,marginRight:8}}/>{b.bucket}</td>
                  <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:b.color}}>{b.count}</td>
                  <td style={{padding:'10px 14px',fontSize:12,color:'#64748b'}}>{total?((b.count/total)*100).toFixed(1):0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {employees.length > 0 && (
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',fontWeight:800,fontSize:13,borderBottom:'1px solid #f1f5f9'}}>Longest Serving Employees</div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Name','Department','Designation','Years','Joined'].map(h=><th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {employees.slice(0,10).map((e,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                  <td style={{padding:'9px 14px',fontSize:13,fontWeight:600}}>{e.name}</td>
                  <td style={{padding:'9px 14px',fontSize:12,color:'#64748b'}}>{e.dept}</td>
                  <td style={{padding:'9px 14px',fontSize:12,color:'#64748b'}}>{e.designation}</td>
                  <td style={{padding:'9px 14px',fontSize:13,fontWeight:700,color:'#1e40af'}}>{e.years} yrs</td>
                  <td style={{padding:'9px 14px',fontSize:11,color:'#94a3b8'}}>{e.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
         CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function _s() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const COLORS = ['#0ea5e9','#ec4899','#10b981','#f59e0b','#8b5cf6','#ef4444']

export default function HeadcountAnalysisPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const s = _s(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/headcount/analysis', {
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug, 'Content-Type': 'application/json' }
    })
      .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => setData(d.data || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign:'center', padding:60, color:'#7c3aed', fontSize:13, fontWeight:600 }}>⟳ Loading headcount data for {company?.name}...</div>
  if (error)   return <div style={{ padding:20, background:'#fef2f2', borderRadius:12, color:'#dc2626', fontSize:13, margin:20 }}>⚠️ {error}</div>
  if (!data)   return <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}><div style={{ fontSize:40, marginBottom:12 }}>👥</div><div>No headcount data yet for {company?.name}</div></div>

  const byDept   = data.by_dept   || []
  const byGender = data.by_gender || []
  const byType   = data.by_type   || []
  const total    = data.total     || 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', boxShadow:'0 4px 24px rgba(124,58,237,.25)' }}>
        <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>👥 Headcount Analysis</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>{company?.name} · Total Active: {total}</div>
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12 }}>
        {[
          { icon:'👥', label:'Total',  val: total,                                       color:'#7c3aed' },
          { icon:'👨', label:'Male',   val: byGender.find(g=>g.name==='Male')?.value||0,  color:'#0ea5e9' },
          { icon:'👩', label:'Female', val: byGender.find(g=>g.name==='Female')?.value||0,color:'#ec4899' },
          { icon:'🏢', label:'Depts',  val: byDept.length,                               color:'#10b981' },
        ].map((s,i) => (
          <div key={i} style={{ background:`${s.color}08`, borderRadius:14, padding:16, border:`1.5px solid ${s.color}20` }}>
            <div style={{ fontSize:26 }}>{s.icon}</div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color, lineHeight:1.1, marginTop:4 }}>{s.val}</div>
            <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16 }}>
        {/* Gender pie */}
        <div style={{ background:'#fff', borderRadius:16, padding:18, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:12, fontWeight:800, marginBottom:12 }}>Gender Split</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart><Pie data={byGender} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({name,value})=>`${name}: ${value}`}>
              {byGender.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie><Tooltip/></PieChart>
          </ResponsiveContainer>
        </div>
        {/* Dept bar */}
        <div style={{ background:'#fff', borderRadius:16, padding:18, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:12, fontWeight:800, marginBottom:12 }}>Headcount by Department</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byDept} margin={{ top:4, right:8, bottom:24, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="d" tick={{ fontSize:10 }} angle={-35} textAnchor="end" interval={0}/>
              <YAxis tick={{ fontSize:10 }}/>
              <Tooltip/>
              <Bar dataKey="n" radius={[4,4,0,0]}>
                {byDept.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employment type */}
      {byType.length > 0 && (
        <div style={{ background:'#fff', borderRadius:16, padding:18, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:12, fontWeight:800, marginBottom:12 }}>By Employment Type</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {byType.map((t,i) => (
              <div key={i} style={{ flex:1, minWidth:140, background:`${COLORS[i%COLORS.length]}08`,
                borderRadius:10, padding:12, border:`1.5px solid ${COLORS[i%COLORS.length]}20` }}>
                <div style={{ fontSize:20, fontWeight:900, color:COLORS[i%COLORS.length] }}>{t.value}</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

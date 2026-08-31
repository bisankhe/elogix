// FILE: src/components/dashboard/snapshots/HeadcountAnalysisPage.jsx
// TENANT-AWARE: loads real headcount data for logged-in company only
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../../context/AppContext.jsx'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const P = '#7c3aed'
const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const COLORS = ['#0ea5e9','#ec4899','#10b981','#f59e0b']

// Empty defaults — NO mock data shown, only real tenant data
const EMPTY_STATS   = { total:0, male:0, female:0, other:0 }
const EMPTY_DEPT    = []
const EMPTY_GENDER  = []

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e) { return {} }
}

export default function HeadcountAnalysisPage() {
  const [stats,   setStats]   = useState(EMPTY_STATS)
  const [deptData,setDeptData]= useState(EMPTY_DEPT)
  const [gender,  setGender]  = useState(EMPTY_GENDER)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const sess  = getSession()
    const slug  = sess?.company?.slug || localStorage.getItem('elogix_tenant_slug') || ''

    if (!token || !slug) { setLoading(false); return }

    setLoading(true)
    fetch('/api/v1/hr-analytics/headcount', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': slug,
        'Content-Type' : 'application/json',
      }
    })
      .then(r => {
        if (r.status === 401) { window.dispatchEvent(new CustomEvent('elogix:session-expired')); throw new Error('Session expired') }
        if (!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then(data => {
        const d = data.data || data
        setStats({
          total : d.total   || 0,
          male  : d.male    || 0,
          female: d.female  || 0,
          other : d.other   || d.transgender || 0,
        })
        if (d.departments?.length)   setDeptData(d.departments.map(dep => ({ d: dep.name, n: dep.count })))
        if (d.gender_split?.length)  setGender(d.gender_split)
      })
      .catch(err => { setError(err.message) })
      .finally(() => setLoading(false))
  }, [])

  const genderPie = gender.length ? gender : [
    { name: 'Male',   value: stats.male   },
    { name: 'Female', value: stats.female },
    { name: 'Other',  value: stats.other  },
  ].filter(g => g.value > 0)

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:60,color:'#7c3aed',fontSize:13}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:36,marginBottom:8}}>⟳</div>
        Loading headcount data...
      </div>
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>👥 Headcount Analysis</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>
          Total · Male · Female · Other · Department-wise
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{padding:'12px 20px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,fontSize:13,color:'#dc2626'}}>
          ⚠️ {error} — Please refresh.
        </div>
      )}

      {/* No data */}
      {!loading && !error && stats.total === 0 && (
        <div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>
          <div style={{fontSize:36,marginBottom:8}}>👥</div>
          No employee data found for your company.
        </div>
      )}

      {/* Stats grid */}
      {stats.total > 0 && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {[
              {icon:'👥',label:'Total',      val:stats.total,  color:'#7c3aed'},
              {icon:'👨',label:'Male',       val:stats.male,   color:'#0ea5e9'},
              {icon:'👩',label:'Female',     val:stats.female, color:'#ec4899'},
              {icon:'🌈',label:'Other',      val:stats.other,  color:'#10b981'},
            ].map((s,i) => (
              <div key={i} style={{background:`${s.color}08`,borderRadius:14,padding:16,
                border:`1px solid ${s.color}20`,textAlign:'center'}}>
                <div style={{fontSize:26}}>{s.icon}</div>
                <div style={{fontSize:28,fontWeight:900,color:s.color,lineHeight:1.1,marginTop:4}}>{s.val}</div>
                <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:16}}>
            {/* Gender pie */}
            <div style={{background:'#fff',borderRadius:16,padding:18,border:'1px solid #e2e8f0'}}>
              <div style={{fontSize:12,fontWeight:800,marginBottom:8}}>Gender Split</div>
              <div style={{height:180}}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={genderPie} dataKey="value" cx="50%" cy="50%"
                      outerRadius={70} innerRadius={35} paddingAngle={3}
                      label={({name,percent}) => `${name} ${(percent*100).toFixed(0)}%`}
                      labelLine={false}>
                      {genderPie.map((_,i) => <Cell key={i} fill={COLORS[i]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department bar chart */}
            <div style={{background:'#fff',borderRadius:16,padding:18,border:'1px solid #e2e8f0'}}>
              <div style={{fontSize:12,fontWeight:800,marginBottom:8}}>Department-wise Headcount</div>
              {deptData.length === 0 ? (
                <div style={{height:180,display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontSize:12}}>
                  No department data
                </div>
              ) : (
                <div style={{height:180}}>
                  <ResponsiveContainer>
                    <BarChart data={deptData} margin={{top:0,right:10,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="d" tick={{fontSize:8}} interval={0} angle={-20} textAnchor="end" height={28}/>
                      <YAxis tick={{fontSize:8}}/>
                      <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                      <Bar dataKey="n" fill={P} radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

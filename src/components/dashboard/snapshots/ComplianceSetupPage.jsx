// FILE: ComplianceSetupPage.jsx - Compliance Setup (Payroll & Compensation)
// Color-coded compliance health meter: SSF/IRD/Labour Audit deadlines,
// multi-country statutory matrix (Nepal/India/USA/UK/EU/AU/Asia/Gulf).

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'

const FILING_DEADLINES = [
  { id:'f1', filing:'SSF Monthly Contribution', authority:'Social Security Fund', due_date:'2025-07-15', status:'on_track', impact_links:['Letters - SSF'] },
  { id:'f2', filing:'TDS Deposit', authority:'Inland Revenue Department', due_date:'2025-07-25', status:'on_track', impact_links:['Tax Setup'] },
  { id:'f3', filing:'Annual Labour Audit', authority:'Local Labour Office', due_date:'2026-01-13', status:'upcoming', impact_links:['Attendance Reports'] },
  { id:'f4', filing:'CIT Voluntary Remittance', authority:'Citizen Investment Trust', due_date:'2025-07-10', status:'overdue', impact_links:['Letters - CIT'] },
]
const STATUS_CFG = {on_track:{c:'#10b981',bg:'#f0fdf4',label:'On Track'},upcoming:{c:'#3b82f6',bg:'#eff6ff',label:'Upcoming'},overdue:{c:'#ef4444',bg:'#fef2f2',label:'Overdue'}}

const COUNTRY_MATRIX = [
  {country:'Nepal',body:'SSF + IRD',min_wage:'NPR 19,550/mo',top_tax:'29%',status:'active'},
  {country:'India',body:'EPFO + Income Tax Dept',min_wage:'Varies by state',top_tax:'30%+ surcharge',status:'configured'},
  {country:'USA',body:'IRS + State DOL',min_wage:'Federal $7.25/hr (varies)',top_tax:'37% federal',status:'configured'},
  {country:'UK',body:'HMRC',min_wage:'£11.44/hr (NLW)',top_tax:'45%',status:'configured'},
  {country:'EU (general)',body:'National + EU Directive',min_wage:'Varies by member state',top_tax:'Varies',status:'configured'},
  {country:'Australia',body:'ATO + Fair Work',min_wage:'AUD 24.10/hr',top_tax:'45%',status:'configured'},
  {country:'UAE/Gulf',body:'MOHRE (varies)',min_wage:'No federal minimum (most)',top_tax:'0% (no personal income tax)',status:'configured'},
]
const COUNTRY_STATUS_CFG = {active:{c:'#10b981',bg:'#f0fdf4',label:'Active'},configured:{c:'#94a3b8',bg:'#f8fafc',label:'Configured - Inactive'}}

export default function ComplianceSetupPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = FILING_DEADLINES.filter(f=>!search||f.filing.toLowerCase().includes(search.toLowerCase()))
  const overdueCount = FILING_DEADLINES.filter(f=>f.status==='overdue').length
  const healthScore = Math.round(((FILING_DEADLINES.length - overdueCount) / FILING_DEADLINES.length) * 100)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🛡" title="Compliance Setup"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Setup"
        gradient={G}
        stats={[
          {icon:'🛡',label:'Health Score',     value:healthScore+'%'},
          {icon:'📋',label:'Active Filings',    value:FILING_DEADLINES.length},
          {icon:'⚠',label:'Overdue',           value:overdueCount},
          {icon:'🌍',label:'Countries Ready',   value:COUNTRY_MATRIX.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      {/* Compliance health meter */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🛡 Compliance Health Meter - Nepal</div>
        <div style={{height:14,background:'#f1f5f9',borderRadius:14,overflow:'hidden'}}>
          <div style={{width:`${healthScore}%`,height:'100%',background:healthScore>=90?'#10b981':healthScore>=70?'#f59e0b':'#ef4444',borderRadius:14,transition:'width .3s'}}/>
        </div>
        <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>{overdueCount>0?`${overdueCount} filing(s) overdue - resolve to restore full compliance health.`:'All statutory filings current.'}</div>
      </div>

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:220}}><strong>Nepal LA2074 + Social Security Act:</strong> SSF contributions (20% employer + 11% employee of basic), TDS deposit by 25th of following month via IRD portal, Annual Labour Audit due by mid-Poush (mid-January) each year. PAN required for all employees.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search filings..."/>

      <div style={{display:'grid',gap:10,marginTop:14,marginBottom:18}}>
        {filtered.map(f=>{
          const sc = STATUS_CFG[f.status]
          return (
            <div key={f.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.filing,...f}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              <div style={{flex:1,minWidth:160}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{f.filing}</span>
                  <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{f.authority}</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:12,fontWeight:800,color:sc.c}}>{f.due_date}</div>
                <div style={{fontSize:8,color:'#94a3b8'}}>DUE DATE</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Multi-country matrix */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🌍 Multi-Country Compliance Matrix</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:600}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Country','Authority','Min Wage','Top Tax Rate','Status'].map(h=>(
                <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {COUNTRY_MATRIX.map((c,i)=>{
                const csc = COUNTRY_STATUS_CFG[c.status]
                return (
                  <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                    <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{c.country}</td>
                    <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{c.body}</td>
                    <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{c.min_wage}</td>
                    <td style={{padding:'9px 12px',color:'#64748b',fontSize:10}}>{c.top_tax}</td>
                    <td style={{padding:'9px 12px'}}><span style={{background:csc.bg,color:csc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{csc.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:12}}>
          <AIImpact color={A} lines={['Activate any jurisdiction to enable its statutory engine for cross-border hires.','AI monitors for regulatory updates and flags when a jurisdiction\'s thresholds change.','All non-Nepal jurisdictions ship pre-configured but inactive until your organization expands there.']}/>
        </div>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Filing Detail',key:'view'},{icon:'✅',label:'Mark Filed',key:'file'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

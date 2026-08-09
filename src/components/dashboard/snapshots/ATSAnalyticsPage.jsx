// FILE: src/components/dashboard/snapshots/ATSAnalyticsPage.jsx
// ATS Page 11 — Recruitment Analytics & BI
import { useState } from 'react'
import { exportToPDF, exportToExcel } from '../../../utils/exportUtils.js'
import { useApp } from '../../../context/AppContext.jsx'

const FUNNEL=[{stage:'Applied',count:1284,pct:100,color:'#3b82f6'},{stage:'AI Screened',count:642,pct:50,color:'#8b5cf6'},{stage:'HR Review',count:321,pct:25,color:'#0891b2'},{stage:'Written Test',count:193,pct:15,color:'#f97316'},{stage:'Video Interview',count:128,pct:10,color:'#f59e0b'},{stage:'Panel Interview',count:64,pct:5,color:'#10b981'},{stage:'Offer Sent',count:38,pct:3,color:'#1e40af'},{stage:'Hired',count:24,pct:1.9,color:'#059669'}]
const SOURCES=[{s:'LinkedIn',pct:38,hires:9,cost:4200},{s:'Company Portal',pct:24,hires:7,cost:0},{s:'Indeed',pct:16,hires:4,cost:2800},{s:'Referral',pct:10,hires:3,cost:1500},{s:'Naukri',pct:7,hires:1,cost:1800},{s:'Other',pct:5,hires:0,cost:900}]
const DEPT_PERF=[{d:'Technology',open:8,filled:5,tth:18,cph:3200},{d:'Finance',open:3,filled:2,tth:24,cph:2800},{d:'Marketing',open:4,filled:3,tth:15,cph:2400},{d:'Operations',open:6,filled:4,tth:21,cph:2200},{d:'HR',open:2,filled:2,tth:12,cph:1800}]
const RECRUITERS=[{n:'Bikash Shrestha',placed:8,active:12,csat:4.8,tth:16},{n:'Anita Gurung',placed:6,active:9,csat:4.6,tth:19},{n:'Hari Thapa',placed:5,active:11,csat:4.5,tth:22}]

export default function ATSAnalyticsPage(){
  const[period,setPeriod]=useState('Q3 2081')
  const[tab,setTab]=useState('funnel')
  const[msg,setMsg]=useState('')
  const notify=(m)=>{setMsg(m);setTimeout(()=>setMsg(''),2500)}

  return(
    <div style={{fontFamily:'system-ui,sans-serif'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:900,color:'#0f172a',margin:0}}>Recruitment Analytics & BI</h2>
          <p style={{fontSize:11,color:'#94a3b8',margin:'3px 0 0'}}>Hiring funnel · source analytics · recruiter performance · cost intelligence</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {msg&&<span style={{fontSize:10,color:'#15803d',padding:'4px 12px',background:'#f0fdf4',borderRadius:8,border:'1px solid #bbf7d0'}}>{msg}</span>}
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:10,outline:'none'}}>
            {['Q3 2081','Q2 2081','Q1 2081','FY 2080-81'].map(p=><option key={p}>{p}</option>)}
          </select>
          <button onClick={()=>exportToPDF('Analytics Report','<h2>ATS Analytics Report</h2><p>Recruitment analytics — Future Recruitment Agency, Kathmandu, Nepal</p>')} style={{padding:'6px 14px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#1e3a5f,#1e40af)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📥 Export PDF</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
        {[{l:'Total Applications',v:'1,284',d:'+18%',c:'#3b82f6'},{l:'Positions Filled',v:'24',d:'+6',c:'#10b981'},{l:'Avg Time-to-Hire',v:'19 days',d:'-3d',c:'#8b5cf6'},{l:'Cost per Hire',v:'NPR 2,850',d:'-8%',c:'#f59e0b'},{l:'Offer Acceptance',v:'84%',d:'+5%',c:'#06b6d4'},{l:'AI Shortlist Accuracy',v:'91%',d:'+4%',c:'#ec4899'}].map((k,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:12,padding:'12px 16px',border:'1px solid #f1f5f9',flex:'1 1 140px',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
            <div style={{fontSize:11,color:'#94a3b8',marginBottom:3}}>{k.l}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div>
            <div style={{fontSize:9,color:k.d.startsWith('+')?'#10b981':'#8b5cf6',marginTop:2}}>{k.d} vs last period</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {[['funnel','🔻 Hiring Funnel'],['sources','📡 Source Analytics'],['dept','🏢 By Department'],['recruiters','👤 Recruiter Perf'],['ai','🤖 AI Intelligence']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:tab===v?'#1e40af':'#f1f5f9',color:tab===v?'#fff':'#475569',fontSize:10,fontWeight:700,cursor:'pointer'}}>{l}</button>
        ))}
      </div>

      {tab==='funnel'&&(
        <div style={{background:'#fff',borderRadius:14,padding:24,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:18}}>Recruitment Funnel — {period}</div>
          {FUNNEL.map((f,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:4}}>
                <span style={{fontWeight:700,color:'#334155'}}>{f.stage}</span>
                <span style={{color:'#94a3b8'}}>{f.count.toLocaleString()} candidates · {f.pct}%</span>
              </div>
              <div style={{height:28,background:'#f1f5f9',borderRadius:6,overflow:'hidden',position:'relative'}}>
                <div style={{height:'100%',width:`${f.pct}%`,background:f.color,borderRadius:6,display:'flex',alignItems:'center',paddingLeft:8,transition:'width .6s'}}>
                  {f.pct>8&&<span style={{fontSize:10,fontWeight:800,color:'#fff'}}>{f.count}</span>}
                </div>
              </div>
              {i<FUNNEL.length-1&&(
                <div style={{fontSize:8,color:'#94a3b8',textAlign:'right',marginTop:2}}>Drop-off: {(100-FUNNEL[i+1].pct/f.pct*100).toFixed(0)}%</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab==='sources'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #e2e8f0'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:16}}>Application Sources</div>
            {SOURCES.map((s,i)=>{
              const colors=['#3b82f6','#8b5cf6','#f97316','#10b981','#f59e0b','#94a3b8']
              return(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                    <span style={{fontWeight:700,color:'#334155'}}>{s.s}</span>
                    <span style={{color:'#94a3b8'}}>{s.pct}%</span>
                  </div>
                  <div style={{height:22,background:'#f1f5f9',borderRadius:5,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${s.pct}%`,background:colors[i],borderRadius:5,transition:'width .5s'}}/>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #e2e8f0'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:16}}>Cost & Quality by Source</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
              <thead><tr style={{background:'#f8fafc'}}>{['Source','Hires','Cost (NPR)','CPH'].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left',color:'#64748b',fontWeight:700}}>{h}</th>)}</tr></thead>
              <tbody>{SOURCES.map((s,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                  <td style={{padding:'6px 8px',fontWeight:600,color:'#334155'}}>{s.s}</td>
                  <td style={{padding:'6px 8px',color:'#10b981',fontWeight:700}}>{s.hires}</td>
                  <td style={{padding:'6px 8px',color:'#64748b'}}>{s.cost.toLocaleString()}</td>
                  <td style={{padding:'6px 8px',color:s.hires?'#1e40af':'#94a3b8',fontWeight:s.hires?700:400}}>{s.hires?Math.round(s.cost/s.hires).toLocaleString():'—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='dept'&&(
        <div style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:16}}>Department Hiring Performance</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
            <thead><tr style={{background:'#f8fafc'}}>{['Department','Open','Filled','Avg TTH (days)','Cost/Hire (NPR)','Fill Rate'].map(h=><th key={h} style={{padding:'8px 10px',textAlign:'left',color:'#64748b',fontWeight:700,fontSize:9}}>{h}</th>)}</tr></thead>
            <tbody>{DEPT_PERF.map((d,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                <td style={{padding:'8px 10px',fontWeight:700,color:'#0f172a'}}>{d.d}</td>
                <td style={{padding:'8px 10px',color:'#64748b'}}>{d.open}</td>
                <td style={{padding:'8px 10px',color:'#10b981',fontWeight:700}}>{d.filled}</td>
                <td style={{padding:'8px 10px',color:d.tth<18?'#10b981':d.tth<24?'#f59e0b':'#ef4444',fontWeight:700}}>{d.tth}</td>
                <td style={{padding:'8px 10px',color:'#64748b'}}>{d.cph.toLocaleString()}</td>
                <td style={{padding:'8px 10px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{flex:1,height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                      <div style={{width:`${Math.round(d.filled/d.open*100)}%`,height:'100%',background:'#10b981',borderRadius:4}}/>
                    </div>
                    <span style={{fontSize:9,color:'#10b981',fontWeight:700,flexShrink:0}}>{Math.round(d.filled/d.open*100)}%</span>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab==='recruiters'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
          {RECRUITERS.map((r,i)=>(
            <div key={i} style={{background:'#fff',borderRadius:14,padding:20,border:'1px solid #f1f5f9',boxShadow:'0 1px 6px rgba(0,0,0,.06)'}}>
              <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'#eff6ff',border:'2px solid #bfdbfe',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#1e40af',flexShrink:0}}>{r.n.split(' ').map(x=>x[0]).join('')}</div>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{r.n}</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>Recruiter</div>
                </div>
                {i===0&&<span style={{marginLeft:'auto',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:8,background:'#fef9c3',color:'#92400e'}}>🏆 Top</span>}
              </div>
              {[{l:'Placements',v:r.placed,c:'#10b981'},{l:'Active Pipelines',v:r.active,c:'#3b82f6'},{l:'CSAT Score',v:r.csat+'/5',c:'#f59e0b'},{l:'Avg TTH',v:r.tth+' days',c:'#8b5cf6'}].map((s,j)=>(
                <div key={j} style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'5px 0',borderBottom:'1px solid #f8fafc'}}>
                  <span style={{color:'#94a3b8'}}>{s.l}</span>
                  <span style={{fontWeight:800,color:s.c}}>{s.v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab==='ai'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
          {[
            {t:'AI Shortlist Accuracy',v:'91%',sub:'Candidates AI-shortlisted that were eventually hired',i:'🤖',c:'#8b5cf6'},
            {t:'Resume Parsing Success',v:'98.4%',sub:'CVs successfully parsed by AI engine',i:'📄',c:'#3b82f6'},
            {t:'Bias Detection Alerts',v:'3',sub:'Potential bias flags raised this quarter',i:'⚠️',c:'#f59e0b'},
            {t:'AI Match vs Hire Rate',v:'87%',sub:'Correlation between AI score and actual performance',i:'🎯',c:'#10b981'},
            {t:'Avg AI Score at Hire',v:'88%',sub:'Average AI match score for all hired candidates',i:'📊',c:'#06b6d4'},
            {t:'Predicted Attrition',v:'2',sub:'Hires predicted at risk of leaving within 90 days',i:'📉',c:'#ef4444'},
          ].map((k,i)=>(
            <div key={i} style={{background:'#fff',borderRadius:12,padding:18,border:'1px solid #f1f5f9',display:'flex',gap:14,alignItems:'flex-start'}}>
              <div style={{fontSize:28,flexShrink:0}}>{k.i}</div>
              <div>
                <div style={{fontSize:10,color:'#94a3b8',marginBottom:4}}>{k.t}</div>
                <div style={{fontSize:22,fontWeight:900,color:k.c,marginBottom:4}}>{k.v}</div>
                <div style={{fontSize:9,color:'#64748b'}}>{k.sub}</div>
              </div>
            </div>
          ))}
          <div style={{gridColumn:'span 2',background:'#eff6ff',borderRadius:12,padding:16,border:'1px solid #bfdbfe',display:'flex',alignItems:'center',gap:14}}>
            <div style={{fontSize:28}}>🔮</div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:800,color:'#1e40af'}}>AI Hiring Forecast — Next Quarter</div>
              <div style={{fontSize:10,color:'#3b82f6',marginTop:3}}>Based on current pipeline and seasonal patterns: <strong>28–34 hires</strong> expected. Technology dept highest demand (+40%). Avg TTH forecast: <strong>17 days</strong> (improving).</div>
            </div>
            <button onClick={()=>notify('✅ Generating full AI forecast report...')} style={{flexShrink:0,padding:'8px 16px',borderRadius:9,border:'none',background:'#1e40af',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>View Full Forecast</button>
          </div>
        </div>
      )}
    </div>
  )
}

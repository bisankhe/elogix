// FILE: ExitAnalysisPage.jsx - Exit Analysis (Exit Analytics)
// AI sentiment NLP gauge, primary reasons bar chart, flight-risk correlation, drill-through table

import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const PRIMARY_REASONS = [
  {reason:'Better Compensation',count:7,pct:39},
  {reason:'Lack of Career Growth',count:5,pct:28},
  {reason:'Management Issues',count:3,pct:17},
  {reason:'Relocation',count:2,pct:11},
  {reason:'Higher Studies',count:1,pct:5},
]

const SENTIMENT_GAUGE = {score:58, label:'Mixed', breakdown:{positive:22,mixed:50,negative:28}}

const FLIGHT_RISK_CORRELATION = [
  {manager:'Dipak Tamang (Sales)',avg_satisfaction:2.8,exits_under_mgmt:5,correlation:'high'},
  {manager:'Anil Bista (Customer Service)',avg_satisfaction:3.1,exits_under_mgmt:4,correlation:'high'},
  {manager:'Bikash Shrestha (IT)',avg_satisfaction:4.2,exits_under_mgmt:2,correlation:'low'},
  {manager:'Sanjay Karki (Finance)',avg_satisfaction:4.6,exits_under_mgmt:1,correlation:'low'},
]

const DRILL_THROUGH = [
  { id:'d1', employee:'Anjali Sharma', dept:'Sales & Marketing', manager:'Dipak Tamang', tenure:'4 months',
    last_rating:'Meets Expectations', salary_band:'Mid', reason:'Better Compensation', regrettable:false,
    sentiment:'mixed', lwd:'2025-06-22' },
  { id:'d2', employee:'Kiran Bhattarai', dept:'Information Technology', manager:'Bikash Shrestha', tenure:'3.5 years',
    last_rating:'Exceeds Expectations', salary_band:'High', reason:'Higher Studies', regrettable:true,
    sentiment:'positive', lwd:'2025-05-31' },
  { id:'d3', employee:'Sunil Magar', dept:'Customer Service', manager:'Anil Bista', tenure:'1.8 years',
    last_rating:'Below Expectations', salary_band:'Low', reason:'Management Issues', regrettable:false,
    sentiment:'negative', lwd:'2025-04-15' },
  { id:'d4', employee:'Dipendra Yadav', dept:'Finance & Accounts', manager:'Sanjay Karki', tenure:'1.3 years',
    last_rating:'Meets Expectations', salary_band:'Mid', reason:'Better Compensation', regrettable:false,
    sentiment:'mixed', lwd:'2025-07-10' },
]

const SENTIMENT_CFG = {positive:{c:'#10b981'},mixed:{c:'#f59e0b'},negative:{c:'#ef4444'}}
const CORR_CFG = {high:{c:'#ef4444',label:'High Correlation - Action Needed'},low:{c:'#10b981',label:'Low Correlation'}}

export default function ExitAnalysisPage() {
  const [filterRegrettable, setFilterRegrettable] = useState('all')
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [selected, setSelected] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = DRILL_THROUGH.filter(d=>{
    if (filterRegrettable==='regrettable') return d.regrettable
    if (filterRegrettable==='non_regrettable') return !d.regrettable
    return true
  })
  const regrettableCount = DRILL_THROUGH.filter(d=>d.regrettable).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔬" title="Exit Analysis"
        breadcrumb="Employee Lifecycle > Offboarding > Exit Analytics"
        gradient={G}
        stats={[
          {icon:'🔬',label:'Exits Analyzed',  value:DRILL_THROUGH.length},
          {icon:'⭐',label:'Regrettable',      value:regrettableCount},
          {icon:'😐',label:'Avg Sentiment',    value:SENTIMENT_GAUGE.score+'/100'},
          {icon:'🎯',label:'Top Reason',       value:PRIMARY_REASONS[0].reason},
        ]}
        onAdd={()=>notify('📊 Generating Exit Analysis report...', setTimeout(()=>notify('✅ Report generated and ready to download'),1500))} addLabel="📊 Export Report" onExcel={()=>{}}/>

      <div style={{background:'linear-gradient(135deg,#faf5ff,#f5f3ff)',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>💡</span>
        <div><strong>Regrettable vs Non-Regrettable:</strong> Always differentiate top performers leaving (regrettable - resource allocation priority) from low performers exiting (non-regrettable). Exit interview participation is voluntary under Nepal law - refusal never impacts final settlement.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        {/* Primary Reasons */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📊 Primary Reasons for Leaving</div>
          {PRIMARY_REASONS.map((r,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
                <span style={{color:'#374151',fontWeight:600}}>{r.reason}</span>
                <span style={{color:A,fontWeight:700}}>{r.count} ({r.(pct||0)}%)</span>
              </div>
              <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                <div style={{width:`${r.(pct||0)}%`,height:'100%',background:`linear-gradient(90deg,${A},${A}88)`,borderRadius:8}}/>
              </div>
            </div>
          ))}
        </div>

        {/* AI Sentiment Gauge */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🤖 AI Sentiment Analysis (NLP)</div>
          <div style={{display:'flex',alignItems:'center',gap:20}}>
            <div style={{position:'relative',width:90,height:90}}>
              <svg width="90" height="90" style={{transform:'rotate(-90deg)'}}>
                <circle cx="45" cy="45" r="38" fill="none" stroke="#f1f5f9" strokeWidth="9"/>
                <circle cx="45" cy="45" r="38" fill="none" stroke={SENTIMENT_GAUGE.score>=70?'#10b981':SENTIMENT_GAUGE.score>=50?'#f59e0b':'#ef4444'}
                  strokeWidth="9" strokeDasharray={`${2*Math.PI*38}`} strokeDashoffset={`${2*Math.PI*38*(1-SENTIMENT_GAUGE.score/100)}`} strokeLinecap="round"/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:20,fontWeight:900,color:'#0f172a'}}>{SENTIMENT_GAUGE.score}</span>
                <span style={{fontSize:8,color:'#94a3b8'}}>{SENTIMENT_GAUGE.label}</span>
              </div>
            </div>
            <div style={{flex:1}}>
              {Object.entries(SENTIMENT_GAUGE.breakdown).map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'4px 0'}}>
                  <span style={{color:SENTIMENT_CFG[k]?.c,fontWeight:700,textTransform:'capitalize'}}>{k}</span>
                  <span style={{color:'#64748b'}}>{v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Flight-Risk Correlation */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>⚡ Flight-Risk Correlation: Manager Satisfaction vs Exits</div>
        <div style={{fontSize:10,color:'#94a3b8',marginBottom:12}}>Cross-referencing prior engagement survey scores with departure timing</div>
        {FLIGHT_RISK_CORRELATION.map((m,i)=>{
          const cc = CORR_CFG[m.correlation]
          return (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:i<FLIGHT_RISK_CORRELATION.length-1?'1px solid #f8fafc':'none'}}>
              <div style={{flex:1,fontSize:11,color:'#374151',fontWeight:600}}>{m.manager}</div>
              <div style={{width:100,textAlign:'center'}}>
                <span style={{fontSize:12,fontWeight:800,color:m.avg_satisfaction>=4?'#10b981':m.avg_satisfaction>=3?'#f59e0b':'#ef4444'}}>{m.avg_satisfaction}/5</span>
                <div style={{fontSize:8,color:'#94a3b8'}}>Avg Satisfaction</div>
              </div>
              <div style={{width:80,textAlign:'center'}}>
                <span style={{fontSize:12,fontWeight:800,color:A}}>{m.exits_under_mgmt}</span>
                <div style={{fontSize:8,color:'#94a3b8'}}>Exits</div>
              </div>
              <span style={{background:`${cc.c}15`,color:cc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{cc.label}</span>
            </div>
          )
        })}
      </div>

      {/* Drill-Through Detail Table */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>🔍 Drill-Through: Individual Exit Detail</span>
          <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
            {['all','regrettable','non_regrettable'].map(f=>(
              <button key={f} onClick={()=>setFilterRegrettable(f)}
                style={{padding:'6px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                  background:filterRegrettable===f?'#fff':'transparent',color:filterRegrettable===f?A:'#64748b',
                  fontWeight:filterRegrettable===f?700:400,boxShadow:filterRegrettable===f?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
                {f==='all'?'All':f==='regrettable'?'⭐ Regrettable':'Non-Regrettable'}
              </button>
            ))}
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Employee','Department','Manager','Tenure','Last Rating','Reason','Sentiment','Regrettable'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(d=>(
                <tr key={d.id} style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                  onClick={()=>setSelected(d)}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.employee,impact_links:['Employee Timeline','Exit Interview']}})}}
                  onMouseEnter={e=>e.currentTarget.style.background='#faf5ff'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <td style={{padding:'9px 14px',fontWeight:700,color:'#0f172a'}}>{d.employee}</td>
                  <td style={{padding:'9px 14px',color:'#64748b',fontSize:10}}>{d.dept}</td>
                  <td style={{padding:'9px 14px',color:'#64748b',fontSize:10}}>{d.manager}</td>
                  <td style={{padding:'9px 14px',color:'#94a3b8',fontSize:10}}>{d.tenure}</td>
                  <td style={{padding:'9px 14px',fontSize:10}}>{d.last_rating}</td>
                  <td style={{padding:'9px 14px',fontSize:10,color:A,fontWeight:600}}>{d.reason}</td>
                  <td style={{padding:'9px 14px'}}><span style={{color:SENTIMENT_CFG[d.sentiment]?.c,fontWeight:700,fontSize:9,textTransform:'capitalize'}}>{d.sentiment}</span></td>
                  <td style={{padding:'9px 14px',textAlign:'center'}}>{d.regrettable&&<span style={{fontSize:13}}>⭐</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {/* Export Report Modal placeholder */}
      <div style={{display:'none'}} id="report-placeholder"/>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Profile',key:'view'},{icon:'📝',label:'View Exit Interview',key:'interview'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export (CSV)',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

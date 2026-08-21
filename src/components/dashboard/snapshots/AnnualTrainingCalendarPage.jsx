// FILE: AnnualTrainingCalendarPage.jsx - Annual Training Calendar
// (Performance & Talent > Talent Development > Learning & Development)
// Strategic 12-month matrix: quarterly org-dev themes, budget gauge,
// mandatory certification expiry panel. Drag-reorder departments across
// months for workload balancing.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const MONTHS = ['Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra','Baishakh','Jestha','Ashadh']
const QUARTER_THEMES = [
  {q:'Q1',months:[0,1,2],theme:'Compliance & OSH Refresher',color:'#ef4444'},
  {q:'Q2',months:[3,4,5],theme:'Technical Upskilling',color:'#0284c7'},
  {q:'Q3',months:[6,7,8],theme:'Leadership Development',color:'#7c3aed'},
  {q:'Q4',months:[9,10,11],theme:'Annual Review & Soft Skills',color:'#10b981'},
]

const BUDGET = { allocated_npr:2400000, utilized_npr:1380000 }

const CERT_EXPIRY = [
  {cert:'Fire Safety & OSH (10+ employee mandate)',expires_month:'Poush',days_left:42,status:'urgent'},
  {cert:'Data Privacy Compliance',expires_month:'Magh',days_left:78,status:'upcoming'},
  {cert:'First Aid Certification',expires_month:'Chaitra',days_left:130,status:'upcoming'},
]

export default function AnnualTrainingCalendarPage() {
  const [year, setYear] = useState('2082/83 BS')
  const [showWizard, setShowWizard] = useState(false)
  const [ctx, setCtx] = useState(null)
  const budgetPct = Math.round(BUDGET.utilized_npr/BUDGET.allocated_npr*100)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗓" title="Annual Training Calendar"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'📅',label:'Fiscal Year',     value:year},
          {icon:'💰',label:'Budget Utilized',  value:budgetPct+'%'},
          {icon:'⚠',label:'Certs Expiring',    value:CERT_EXPIRY.length},
          {icon:'🎯',label:'Org Themes',        value:QUARTER_THEMES.length},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Add Annual Initiative"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>Strategic Planning, Once a Year:</strong> Maps macro organizational development goals to fiscal quarters, tracks mandatory OSH/compliance certifications (Chapter 10, Nepal Labour Act 2074), and forecasts department-level budget allocation - all before the year begins.</div>
      </div>

      {/* Budget gauge */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:18}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12}}>
          <span style={{fontWeight:800,color:'#0f172a'}}>💰 Training Budget Utilization</span>
          <span style={{fontWeight:800,color:A}}>NPR {BUDGET.utilized_npr.toLocaleString()} / {BUDGET.allocated_npr.toLocaleString()}</span>
        </div>
        <div style={{height:14,background:'#f1f5f9',borderRadius:14,overflow:'hidden'}}>
          <div style={{width:`${budgetPct}%`,height:'100%',background:budgetPct>90?'#ef4444':A,borderRadius:14}}/>
        </div>
      </div>

      {/* 12-month quarter matrix */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18,overflowX:'auto'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>📊 Fiscal Year Quarter Matrix</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,minWidth:600}}>
          {QUARTER_THEMES.map((qt,i)=>(
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:qt.q,theme:qt.theme,impact_links:['Training Needs Analysis']}})}}
              style={{background:`${qt.color}10`,border:`1.5px solid ${qt.color}33`,borderRadius:12,padding:'14px'}}>
              <div style={{fontSize:11,fontWeight:800,color:qt.color,marginBottom:8}}>{qt.q}</div>
              <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginBottom:10}}>{qt.theme}</div>
              {qt.months.map(mi=>(<div key={mi} style={{fontSize:9,color:'#64748b',padding:'3px 0'}}>{MONTHS[mi]}</div>))}
            </div>
          ))}
        </div>
      </div>

      {/* Certification expiry panel */}
      <div style={{background:'#fff',border:'1px solid #fed7aa',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>⚠ Mandatory Certifications Expiring</div>
        {CERT_EXPIRY.map((c,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:i<CERT_EXPIRY.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{c.cert}</div>
              <div style={{fontSize:9,color:'#94a3b8'}}>Expires: {c.expires_month}</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{background:c.status==='urgent'?'#fef2f2':'#fffbeb',color:c.status==='urgent'?'#dc2626':'#b45309',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{c.days_left}d left</span>
              <button style={{padding:'5px 12px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Schedule Renewal</button>
            </div>
          </div>
        ))}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(560px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Annual Training Initiative</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Initiative Title" value="" onChange={()=>{}} accent={A} required/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Target Quarter" type="select" value="" onChange={()=>{}} accent={A} options={['Q1','Q2','Q3','Q4']}/>
                <Field label="Budget Allocation (NPR)" type="number" value="" onChange={()=>{}} accent={A}/>
              </div>
              <Field label="Target Department(s)" type="select" value="" onChange={()=>{}} accent={A} options={['All Departments','IT','Sales & Marketing','Finance']}/>
              <Field label="Notes" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['Auto-checks budget cap before allowing initiative addition.','Mandatory compliance courses auto-flagged if missing from any quarter.','Cascades down into Monthly/Weekly/Daily calendars once scheduled.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Initiative</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Quarter Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

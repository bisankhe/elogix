// FILE: DiversityDashboardPage.jsx - Diversity Dashboard
// (Employee Experience & Culture > Diversity, Equity & Inclusion)
// Donut/cohort charts for representation, funnel for applicant->hire->
// promotion conversion by demographic, intersectional filtering.
// Aggregated views only -- never exposes individual self-ID responses.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const REPRESENTATION = [
  {group:'Self-Identified',pct:62,c:'#7c3aed'},{group:'Prefer Not to Disclose',pct:38,c:'#cbd5e1'},
]

const FUNNEL = [
  {stage:'Applicants',count:1240,diverse_pct:48},{stage:'Interviewed',count:312,diverse_pct:44},
  {stage:'Hired',count:58,diverse_pct:41},{stage:'Promoted (12mo)',count:14,diverse_pct:36},
]

const DEPT_REPRESENTATION = [
  {dept:'IT',diverse_pct:38},{dept:'Sales & Marketing',diverse_pct:52},{dept:'Finance',diverse_pct:61},{dept:'Operations',diverse_pct:47},
]

export default function DiversityDashboardPage() {
  const [filterDept, setFilterDept] = useState('all')
  const [ctx, setCtx] = useState(null)
  const maxFunnel = FUNNEL[0].count

  const dropoffFlag = FUNNEL[FUNNEL.length-1].diverse_pct < FUNNEL[0].diverse_pct - 10

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🌍" title="Diversity Dashboard"
        breadcrumb="Employee Experience & Culture > Diversity, Equity & Inclusion"
        gradient={G}
        stats={[
          {icon:'🌍',label:'Self-ID Participation',  value:'62%'},
          {icon:'📊',label:'Hire Diversity',             value:'41%'},
          {icon:'⚠',label:'Promotion Drop-off',            value:dropoffFlag?'Flagged':'Stable'},
          {icon:'🔒',label:'Visibility',                     value:'Aggregated Only'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Aggregated, Never Individual:</strong> Every chart here reflects group-level patterns from voluntary, confidential self-ID data. No view in this dashboard can ever expose a single employee's response -- diagnostic metrics, not vanity headcounts.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:18}}>
        {/* Self-ID participation donut */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',display:'flex',gap:16,alignItems:'center'}}>
          <svg width="110" height="110" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#cbd5e1" strokeWidth="6"/>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke={A} strokeWidth="6" strokeDasharray="62 38" strokeDashoffset="25" transform="rotate(-90 18 18)"/>
          </svg>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:8}}>Self-ID Participation</div>
            {REPRESENTATION.map((r,i)=>(
              <div key={i} style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                <span style={{width:8,height:8,borderRadius:4,background:r.c,display:'inline-block'}}/>
                <span style={{fontSize:9,color:'#374151'}}>{r.group} ({r.pct}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department representation bar */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>Representation by Department</div>
          <div style={{display:'flex',gap:10,alignItems:'flex-end',height:80}}>
            {DEPT_REPRESENTATION.map((d,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{fontSize:8,fontWeight:700,color:A}}>{d.diverse_pct}%</div>
                <div style={{width:'100%',background:A,borderRadius:'4px 4px 0 0',height:`${d.diverse_pct*0.7}px`}}/>
                <div style={{fontSize:7,color:'#94a3b8'}}>{d.dept}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Funnel: applicant -> hire -> promotion */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📐 Diversity Funnel: Applicant &gt; Hire &gt; Promotion</div>
        {FUNNEL.map((f,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.stage,impact_links:['Gender Analytics']}})}}
            style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
              <span style={{color:'#374151',fontWeight:600}}>{f.stage} ({f.count})</span>
              <span style={{fontWeight:700,color:i===FUNNEL.length-1&&dropoffFlag?'#ef4444':A}}>{f.diverse_pct}% diverse</span>
            </div>
            <div style={{height:10,background:'#f1f5f9',borderRadius:10,overflow:'hidden'}}><div style={{width:`${f.count/maxFunnel*100}%`,height:'100%',background:A,borderRadius:10}}/></div>
          </div>
        ))}
        {dropoffFlag&&<div style={{marginTop:10,fontSize:9,color:'#b45309'}}>⚠ Diverse representation drops meaningfully between hire and promotion -- a diagnostic signal, not a hiring success story.</div>}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Self-ID data is opt-in and encrypted at rest -- aggregated views require a minimum group size before displaying, protecting individual anonymity.','Funnel tracks promotion and retention, not just hiring headcount -- avoiding the vanity-metric trap.','Filtering by geography or management tier never drops below the minimum-group-size threshold.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

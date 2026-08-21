// FILE: KRAManagementPage.jsx - KRA Management (Performance & Talent > Goal & Performance > Goal Management)
// KRA-JD matching engine, department->team cascade (annual->quarterly->
// monthly->weekly->daily), review-cadence matrix (Management/HR/HOD/
// Supervisor/Team Lead), AI-drafted SMART KRA suggestions.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const KRAS = [
  { id:'k1', kra_title:'Revenue Generation & Client Retention', designation:'Sales Manager', weightage:40,
    jd_match_pct:95, jd_unmatched_items:['Vendor contract negotiation (in JD, no linked KRA)'],
    cascade_level:'department', quarter_target_pct:25, progress_pct:75,
    review_cadence:'Quarterly (Management) / Monthly (HOD)', impact_links:['KPI Management','Performance Review'] },
  { id:'k2', kra_title:'Team Capability & Leadership Growth', designation:'Engineering Lead', weightage:30,
    jd_match_pct:100, jd_unmatched_items:[],
    cascade_level:'individual', quarter_target_pct:25, progress_pct:40,
    review_cadence:'Monthly (HR+HOD) / Weekly (Supervisor)', impact_links:['Goal Tracking'] },
  { id:'k3', kra_title:'Digital Brand Growth', designation:'Marketing Head', weightage:35,
    jd_match_pct:78, jd_unmatched_items:['Crisis communication management','Press relations'],
    cascade_level:'department', quarter_target_pct:25, progress_pct:60,
    review_cadence:'Quarterly (Management)', impact_links:['Goal Assignment'] },
]

const CASCADE_TIERS = [
  {tier:'Annual',owner:'Department Head',freq:'Set once a year',icon:'🎯'},
  {tier:'Quarterly',owner:'Management Level',freq:'25% per quarter, reviewed quarterly',icon:'📅'},
  {tier:'Monthly',owner:'HR + HOD Level',freq:'Monitored monthly',icon:'🗓'},
  {tier:'Weekly',owner:'HOD / Manager / Supervisor',freq:'Supervised weekly',icon:'📆'},
  {tier:'Daily',owner:'Team Leader / Supervisor',freq:'Monitored daily',icon:'☀'},
]

export default function KRAManagementPage() {
  const [kras, setKras] = useState(KRAS)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = kras.filter(k=>!search||k.kra_title.toLowerCase().includes(search.toLowerCase()))
  const unmatchedCount = kras.filter(k=>k.jd_match_pct<100).length
  const avgMatch = Math.round(kras.reduce((s,k)=>s+k.jd_match_pct,0)/kras.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="KRA Management"
        breadcrumb="Performance & Talent Management > Goal & Performance > Goal Management"
        gradient={G}
        stats={[
          {icon:'🎯',label:'Active KRAs',       value:kras.length},
          {icon:'📋',label:'Avg JD Match',       value:avgMatch+'%'},
          {icon:'⚠',label:'JD Gaps Found',      value:unmatchedCount},
          {icon:'🔄',label:'Cascade Tiers',      value:CASCADE_TIERS.length},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Define New KRA"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>KRA-JD Matching:</strong> Every KRA must trace back to a responsibility line in the position's Job Description - and every JD must be covered by at least one KRA. Unmatched JD items signal a gap; unmatched KRAs signal scope creep beyond the role.</div>
      </div>

      {/* Cascade tier visualization */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>🔄 Goal Cascade & Review Cadence</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
          {CASCADE_TIERS.map((t,i)=>(
            <div key={i} style={{background:`${A}08`,border:`1.5px solid ${A}22`,borderRadius:12,padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:20,marginBottom:6}}>{t.icon}</div>
              <div style={{fontSize:11,fontWeight:800,color:A}}>{t.tier}</div>
              <div style={{fontSize:8,color:'#64748b',marginTop:4}}>{t.owner}</div>
              <div style={{fontSize:7,color:'#94a3b8',marginTop:3}}>{t.freq}</div>
            </div>
          ))}
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search KRAs by title..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(k=>{
          const matchColor = k.jd_match_pct>=95?'#10b981':k.jd_match_pct>=80?'#f59e0b':'#ef4444'
          return (
            <div key={k.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:k.kra_title,...k}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:3}}>{k.kra_title}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{k.designation} . Weightage: {k.weightage}% . {k.cascade_level==='department'?'🏢 Department':'👤 Individual'}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:matchColor}}>{k.jd_match_pct}%</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>JD MATCH</div>
                </div>
              </div>

              <div style={{padding:'12px 18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:9}}>
                  <span style={{color:'#64748b'}}>Quarter Progress (target {k.quarter_target_pct}%)</span><span style={{fontWeight:700,color:A}}>{k.progress_pct}%</span>
                </div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                  <div style={{width:`${k.progress_pct}%`,height:'100%',background:k.progress_pct>=k.quarter_target_pct?'#10b981':'#f59e0b',borderRadius:8}}/>
                </div>
              </div>

              {k.jd_unmatched_items.length>0&&(
                <div style={{padding:'10px 18px',background:'#fffbeb',fontSize:10,color:'#92400e'}}>
                  <strong>⚠ JD items not yet covered by a KRA:</strong> {k.jd_unmatched_items.join(' . ')}
                </div>
              )}

              <div style={{padding:'10px 18px',fontSize:9,color:'#94a3b8'}}>📋 Review cadence: {k.review_cadence}</div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(620px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Define New KRA</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>Must trace to at least one Job Description responsibility.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Designation / Position" type="select" value="" onChange={()=>{}} accent={A} options={['Sales Manager','Engineering Lead','Marketing Head','HR Manager']}/>
                <Field label="Weightage (%)" type="number" value="" onChange={()=>{}} accent={A} required/>
              </div>
              <Field label="KRA Title" value="" onChange={()=>{}} accent={A} required hint="Broad area of accountability, not a task"/>
              <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',margin:'8px 0',fontSize:10,color:'#374151'}}>
                <strong>JD Responsibilities for this position:</strong>
                <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:4}}>
                  <label style={{display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" defaultChecked/> Close $500k ARR pipeline per quarter</label>
                  <label style={{display:'flex',gap:6,alignItems:'center'}}><input type="checkbox"/> Vendor contract negotiation</label>
                  <label style={{display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" defaultChecked/> Maintain client retention above 95%</label>
                </div>
              </div>
              <Field label="Cascade Level" type="select" value="" onChange={()=>{}} accent={A} options={['Department-wide (auto-divides to teams)','Individual']}/>
              <Field label="Notes / SMART Criteria" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['AI checks every JD responsibility line against existing KRAs - flags any gap instantly.','Department-level KRAs auto-divide equally across teams, then quarterly/monthly/weekly/daily.','Review cadence auto-assigned: Quarterly (Management), Monthly (HR+HOD), Weekly (Supervisor), Daily (Team Lead).','Notification sent to the position holder and their reporting manager once published.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Publish KRA</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View JD Match Detail',key:'view'},{icon:'✏',label:'Edit KRA',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="KRA Management" columns={['KRA Title','Designation','Weightage %','JD Match %','Cascade Level','Quarter Target %','Progress %','Review Cadence']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

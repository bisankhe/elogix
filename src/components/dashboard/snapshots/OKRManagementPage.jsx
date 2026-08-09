// FILE: OKRManagementPage.jsx - OKR Management (Performance & Talent > Goal & Performance > Goal Management)
// Cascading strategy tree (Company -> Dept -> Team -> Individual), 0-1.0
// scoring scale (0.7 = sweet spot), quarterly cadence, check-in modal,
// distinct from KRA (routine accountability) -- OKRs are aspirational stretch goals.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const OKR_TREE = [
  { id:'o1', objective:'Expand APAC Market Share by 15%', level:'company', parent_id:null,
    key_results:[
      {kr:'Secure 20 new Fortune-500 logos in APAC',current:11,target:20,score:0.55},
      {kr:'Grow APAC revenue from $4M to $6M',current:4.8,target:6,score:0.6},
    ],
    quarter:'Q3 2026', overall_score:0.58, status:'on_track', impact_links:['KRA Management'] },
  { id:'o2', objective:'Enable Sales Team Execution Excellence', level:'department', parent_id:'o1',
    key_results:[
      {kr:'Close 4 enterprise deals in Singapore',current:2,target:4,score:0.5},
      {kr:'Close 3 enterprise deals in Australia',current:3,target:3,score:1.0},
    ],
    quarter:'Q3 2026', overall_score:0.75, status:'on_track', impact_links:['Goal Assignment'] },
  { id:'o3', objective:'Modernize Internal Engineering Tooling', level:'team', parent_id:null,
    key_results:[
      {kr:'Migrate 80% of services to new CI/CD',current:35,target:80,score:0.44},
      {kr:'Reduce build time by 50%',current:18,target:50,score:0.36},
    ],
    quarter:'Q3 2026', overall_score:0.40, status:'at_risk', impact_links:['Goal Tracking'] },
]

const LEVEL_CFG = {company:{c:'#7c3aed',icon:'🏢',label:'Company'},department:{c:'#0284c7',icon:'🏬',label:'Department'},team:{c:'#10b981',icon:'👥',label:'Team'},individual:{c:'#f59e0b',icon:'👤',label:'Individual'}}
const STATUS_CFG = {on_track:{c:'#10b981',bg:'#f0fdf4',label:'On Track'},at_risk:{c:'#f59e0b',bg:'#fffbeb',label:'At Risk'},off_track:{c:'#ef4444',bg:'#fef2f2',label:'Off Track'}}

export default function OKRManagementPage() {
  const [okrs, setOkrs] = useState(OKR_TREE)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showCheckin, setShowCheckin] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = okrs.filter(o=>!search||o.objective.toLowerCase().includes(search.toLowerCase()))
  const avgScore = (okrs.reduce((s,o)=>s+o.overall_score,0)/okrs.length).toFixed(2)
  const atRiskCount = okrs.filter(o=>o.status==='at_risk'||o.status==='off_track').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🚀" title="OKR Management"
        breadcrumb="Performance & Talent Management > Goal & Performance > Goal Management"
        gradient={G}
        stats={[
          {icon:'🚀',label:'Active OKRs',     value:okrs.length},
          {icon:'📊',label:'Avg Score',        value:avgScore+'/1.0'},
          {icon:'⚠',label:'At Risk',          value:atRiskCount},
          {icon:'📅',label:'Cadence',          value:'Quarterly'},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Set New OKR"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Aspirational, Not Routine:</strong> Unlike KRAs (ongoing accountability) and KPIs (operational health checks), OKRs are ambitious stretch goals - scored 0.0 to 1.0, with 0.7 considered the "sweet spot" (appropriately ambitious, not sandbagged). Set quarterly; 100% achievement every time may signal goals weren't ambitious enough.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search objectives..."/>

      {/* Cascading strategy tree */}
      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(o=>{
          const lc = LEVEL_CFG[o.level]
          const sc = STATUS_CFG[o.status]
          const scoreColor = o.overall_score>=0.7?'#10b981':o.overall_score>=0.4?'#f59e0b':'#ef4444'
          return (
            <div key={o.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:o.objective,...o}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`,marginLeft:o.parent_id?28:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    {o.parent_id&&<span style={{color:'#94a3b8',fontSize:11}}>↳</span>}
                    <span style={{background:`${lc.c}15`,color:lc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{lc.icon} {lc.label}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{o.objective}</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{o.quarter}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:scoreColor}}>{o.overall_score.toFixed(2)}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>SCORE / 1.0</div>
                </div>
              </div>

              <div style={{padding:'12px 18px'}}>
                {o.key_results.map((kr,i)=>(
                  <div key={i} style={{marginBottom:i<o.key_results.length-1?12:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
                      <span style={{color:'#374151',fontWeight:600}}>{kr.kr}</span>
                      <span style={{fontWeight:700,color:A}}>{kr.current}/{kr.target}</span>
                    </div>
                    <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}>
                      <div style={{width:`${Math.min(kr.score*100,100)}%`,height:'100%',background:kr.score>=0.7?'#10b981':kr.score>=0.4?'#f59e0b':'#ef4444',borderRadius:7}}/>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{padding:'10px 18px',display:'flex',gap:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowCheckin(o)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#fff7ed',color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>💬 Check-In</button>
                <button style={{padding:'6px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontSize:10,fontWeight:600,cursor:'pointer'}}>👏 Praise</button>
              </div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(620px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Set New OKR</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>"We will [Objective] as measured by [Key Result]"</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Level" type="select" value="" onChange={()=>{}} accent={A} options={['Company','Department','Team','Individual']}/>
                <Field label="Parent Objective (cascade)" type="select" value="" onChange={()=>{}} accent={A} options={['None (top-level)','Expand APAC Market Share by 15%']}/>
              </div>
              <Field label="Objective" value="" onChange={()=>{}} accent={A} required hint="Qualitative, inspirational - where we want to go"/>
              <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',margin:'8px 0',fontSize:10,color:'#374151'}}>
                <strong>Key Results (2-3 measurable, quantitative):</strong>
                <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:6}}>
                  <input placeholder="Key Result 1 - e.g. Close 4 enterprise deals" style={{padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:10}}/>
                  <input placeholder="Key Result 2" style={{padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:10}}/>
                </div>
              </div>
              <Field label="Quarter" type="select" value="" onChange={()=>{}} accent={A} options={['Q1 2026','Q2 2026','Q3 2026','Q4 2026']}/>
              <AIImpact color={A} lines={['AI suggests realistic but ambitious targets based on historical team velocity.','Scoring uses the 0.0-1.0 scale - aim for 0.7 (the sweet spot), not 1.0.','Notification sent to the objective owner and their reporting manager once published.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Publish OKR</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCheckin&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowCheckin(null)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Weekly Check-In</div></div>
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:10}}>{showCheckin.objective}</div>
              <Field label="Confidence Score (1-10)" type="number" value="" onChange={()=>{}} accent={A}/>
              <Field label="Roadblocks" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <Field label="Next Steps" type="textarea" value="" onChange={()=>{}} accent={A}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowCheckin(null)} style={{flex:1,padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Check-In</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Tree',key:'view'},{icon:'💬',label:'Check-In',key:'checkin'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="OKR Management" columns={['Objective','Level','Key Result 1','Key Result 2','Quarter','Score','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

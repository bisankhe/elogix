// FILE: GoalAssignmentPage.jsx - Goal Assignment (Performance & Talent > Goal & Performance > Goal Management)
// Annual department target (set once/year at fiscal-year open) -> team
// split -> auto-cascade quarterly/monthly/weekly/daily -> role-aware
// assignment by JD nature (Sales/Admin/Technical/HR/Manufacturing/Banking).

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const JD_NATURE_TEMPLATES = {
  Sales:{icon:'💰',metric:'Revenue / Deals Closed',example:'Close NPR 2M in new business this quarter'},
  Admin:{icon:'📋',metric:'Process Turnaround Time',example:'Process 95% of requests within 24 hours'},
  Technical:{icon:'⚙',metric:'Delivery Velocity / Uptime',example:'Ship 12 story points/sprint, 99.5% uptime'},
  HR:{icon:'👥',metric:'Time-to-Fill / Engagement',example:'Reduce time-to-fill to 21 days'},
  Corporate:{icon:'🏢',metric:'Strategic Initiative Completion',example:'Launch 2 of 3 planned initiatives'},
  Manufacturing:{icon:'🏭',metric:'Units Produced / Defect Rate',example:'Produce 5,000 units, defect rate <1%'},
  Banking:{icon:'🏦',metric:'Portfolio Growth / NPA Ratio',example:'Grow deposit portfolio by 8%'},
}

const DEPT_ANNUAL_TARGETS = [
  { id:'da1', department:'Sales & Marketing', jd_nature:'Sales', fiscal_year:'2082/83 BS', annual_target:'NPR 24M new business',
    teams:[{team:'Enterprise Sales',share_pct:60,target:'NPR 14.4M'},{team:'SMB Sales',share_pct:40,target:'NPR 9.6M'}],
    cascade_status:{quarterly:'divided',monthly:'divided',weekly:'divided',daily:'pending'},
    review_status:{quarterly:'Management - scheduled',monthly:'HR+HOD - on track',weekly:'Supervisor - on track',daily:'Team Lead - active'},
    impact_links:['KRA Management','Bonus Processing'] },
  { id:'da2', department:'IT', jd_nature:'Technical', fiscal_year:'2082/83 BS', annual_target:'99.5% uptime, 4 major releases',
    teams:[{team:'Platform Engineering',share_pct:50,target:'2 releases'},{team:'Product Engineering',share_pct:50,target:'2 releases'}],
    cascade_status:{quarterly:'divided',monthly:'divided',weekly:'pending',daily:'pending'},
    review_status:{quarterly:'Management - scheduled',monthly:'HR+HOD - on track',weekly:'Pending setup',daily:'Pending setup'},
    impact_links:['Workload Analysis'] },
  { id:'da3', department:'Human Resources', jd_nature:'HR', fiscal_year:'2082/83 BS', annual_target:'Time-to-fill ≤21 days, eNPS ≥40',
    teams:[{team:'Talent Acquisition',share_pct:70,target:'Time-to-fill ≤21 days'},{team:'HR Operations',share_pct:30,target:'eNPS ≥40'}],
    cascade_status:{quarterly:'divided',monthly:'divided',weekly:'divided',daily:'divided'},
    review_status:{quarterly:'Management - reviewed Q2',monthly:'HR+HOD - on track',weekly:'Supervisor - on track',daily:'Team Lead - active'},
    impact_links:[] },
]

const CASCADE_STATUS_CFG = {divided:{c:'#10b981',icon:'✅'},pending:{c:'#f59e0b',icon:'⏳'}}

export default function GoalAssignmentPage() {
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [selectedNature, setSelectedNature] = useState('Sales')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = DEPT_ANNUAL_TARGETS.filter(d=>!search||d.department.toLowerCase().includes(search.toLowerCase()))
  const fullyCascadedCount = DEPT_ANNUAL_TARGETS.filter(d=>Object.values(d.cascade_status).every(s=>s==='divided')).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📐" title="Goal Assignment"
        breadcrumb="Performance & Talent Management > Goal & Performance > Goal Management"
        gradient={G}
        stats={[
          {icon:'🏢',label:'Departments',         value:DEPT_ANNUAL_TARGETS.length},
          {icon:'✅',label:'Fully Cascaded',       value:fullyCascadedCount},
          {icon:'📅',label:'Fiscal Year',          value:'2082/83 BS'},
          {icon:'⚖',label:'JD Nature Templates',  value:Object.keys(JD_NATURE_TEMPLATES).length},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Set Annual Department Target"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔄</span>
        <div style={{flex:1,minWidth:200}}><strong>Once a Year, Auto-Cascaded:</strong> Management sets the annual department target at fiscal-year open. It auto-divides across teams, then equally into quarterly{'>'}monthly{'>'}weekly{'>'}daily targets. Review cadence: Management (quarterly), HR+HOD (monthly), Supervisor (weekly), Team Lead (daily). Every department's assignment differs by JD nature - Sales, Admin, Technical, HR, Corporate, Manufacturing, Banking each get role-appropriate metrics.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by department name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(d=>{
          const nature = JD_NATURE_TEMPLATES[d.jd_nature]
          return (
            <div key={d.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.department,...d}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${A}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div style={{flex:1,minWidth:220}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{d.department}</span>
                    <span style={{background:`${A}15`,color:A,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{nature.icon} {d.jd_nature}</span>
                  </div>
                  <div style={{fontSize:11,color:'#374151',fontWeight:600}}>{d.annual_target}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>FY {d.fiscal_year} . Metric basis: {nature.metric}</div>
                </div>
              </div>

              {/* Team split */}
              <div style={{padding:'12px 18px',borderBottom:'1px solid #f8fafc'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',marginBottom:6}}>TEAM SPLIT</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
                  {d.teams.map((t,i)=>(
                    <div key={i} style={{background:'#f8fafc',borderRadius:8,padding:'8px 12px'}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{t.team} <span style={{color:A}}>({t.share_pct}%)</span></div>
                      <div style={{fontSize:9,color:'#64748b'}}>{t.target}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cascade status strip */}
              <div style={{padding:'12px 18px',borderBottom:'1px solid #f8fafc'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',marginBottom:6}}>CASCADE STATUS</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                  {Object.entries(d.cascade_status).map(([period,status])=>{
                    const sc = CASCADE_STATUS_CFG[status]
                    return (
                      <div key={period} style={{textAlign:'center',background:`${sc.c}10`,borderRadius:8,padding:'6px 4px'}}>
                        <div style={{fontSize:13}}>{sc.icon}</div>
                        <div style={{fontSize:8,color:sc.c,fontWeight:700,textTransform:'capitalize',marginTop:2}}>{period}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Review cadence */}
              <div style={{padding:'12px 18px'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',marginBottom:6}}>REVIEW CADENCE</div>
                {Object.entries(d.review_status).map(([period,status],i)=>(
                  <div key={i} style={{fontSize:9,color:'#64748b',marginBottom:2}}><span style={{textTransform:'capitalize',fontWeight:700,color:'#374151'}}>{period}:</span> {status}</div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(640px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Set Annual Department Target</div>
              <div style={{display:'flex',gap:6,marginTop:10}}>{[1,2,3].map(s=>(<div key={s} style={{flex:1,height:4,borderRadius:4,background:s<=wizardStep?'#fff':'rgba(255,255,255,.3)'}}/>))}</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              {wizardStep===1&&(<>
                <Field label="Department" type="select" value="" onChange={()=>{}} accent={A} options={['Sales & Marketing','IT','Human Resources','Finance','Manufacturing','Banking Operations']}/>
                <Field label="JD Nature" type="select" value={selectedNature} onChange={setSelectedNature} accent={A} options={Object.keys(JD_NATURE_TEMPLATES)}/>
                <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 14px',marginTop:8,fontSize:11,color:'#065f46'}}>
                  💡 {JD_NATURE_TEMPLATES[selectedNature].icon} <strong>{selectedNature} template:</strong> {JD_NATURE_TEMPLATES[selectedNature].example}
                </div>
                <Field label="Fiscal Year" value="2082/83 BS" onChange={()=>{}} accent={A}/>
              </>)}
              {wizardStep===2&&(<>
                <Field label="Annual Target Description" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
                <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',margin:'8px 0',fontSize:10,color:'#374151'}}>
                  <strong>Divide across teams:</strong>
                  <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{display:'flex',gap:8}}><input placeholder="Team name" style={{flex:1,padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:10}}/><input placeholder="Share %" style={{width:80,padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:10}}/></div>
                    <div style={{display:'flex',gap:8}}><input placeholder="Team name" style={{flex:1,padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:10}}/><input placeholder="Share %" style={{width:80,padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:10}}/></div>
                  </div>
                </div>
              </>)}
              {wizardStep===3&&(<>
                <div style={{background:'#eff6ff',borderRadius:10,padding:'12px 14px',marginBottom:10,fontSize:11,color:'#1e40af'}}>
                  🔄 Will auto-divide equally: Quarterly (25% each) &gt; Monthly (≈8.33% each) &gt; Weekly &gt; Daily.
                </div>
                <AIImpact color={A} lines={['Cascade auto-generates KRA-linked targets at each tier (quarterly/monthly/weekly/daily).','Review schedule auto-assigned: Management (quarterly), HR+HOD (monthly), Supervisor (weekly), Team Lead (daily).','Notification sent to the Department Head and every team lead once published.']}/>
              </>)}
              <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}>
                {wizardStep>1&&<button onClick={()=>setWizardStep(wizardStep-1)} style={{padding:'12px 22px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Back</button>}
                <button onClick={()=>wizardStep<3?setWizardStep(wizardStep+1):setShowWizard(false)} style={{flex:1,minWidth:160,padding:12,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>{wizardStep<3?'Next':'Publish & Cascade'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Cascade',key:'view'},{icon:'🔄',label:'Re-divide Teams',key:'redivide'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Goal Assignment" columns={['Department','JD Nature','Annual Target','Team','Share %','Team Target','Cascade Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

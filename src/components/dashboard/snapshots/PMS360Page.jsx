// FILE: PMS360Page.jsx - 360 Degree PMS (Performance & Talent > Goal & Performance > Goal Management)
// Competency radar (SVG spider chart), Feedback Hub (incoming/outgoing
// split), Individual Development Plan tracker, HR calibration dashboard,
// anonymity-threshold enforcement (min 3 reviewers).

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#164e63 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const COMPETENCIES = [
  {name:'Leadership',self:7,peer:6,manager:8,report:6},
  {name:'Teamwork',self:8,peer:9,manager:8,report:9},
  {name:'Communication',self:6,peer:7,manager:6,report:5},
  {name:'Technical Skill',self:9,peer:8,manager:9,report:7},
  {name:'Adaptability',self:7,peer:6,manager:7,report:8},
  {name:'Strategic Thinking',self:5,peer:6,manager:7,report:5},
]

const FEEDBACK_HUB = {
  incoming:[
    {from:'Manager - Priya Adhikari',status:'submitted',submitted_at:'2025-06-18',anonymous:false},
    {from:'Peer (Anonymous)',status:'submitted',submitted_at:'2025-06-17',anonymous:true},
    {from:'Direct Report (Anonymous)',status:'pending',submitted_at:null,anonymous:true},
  ],
  outgoing:[
    {about:'Bikash Rai',role:'Peer',status:'pending',due_date:'2025-06-25'},
    {about:'Maya Pradhan',role:'Skip-level',status:'submitted',due_date:'2025-06-20'},
  ],
}

const IDP_ITEMS = [
  {gap:'Strategic Thinking (scored 5-7, lowest competency)',action:'Enroll in "Strategic Planning for Managers" LMS course',progress_pct:30,target_date:'2025-09-30'},
  {gap:'Communication (manager rated lower than self-rating)',action:'Shadow 2 client presentations with VP Sales',progress_pct:60,target_date:'2025-08-15'},
]

const CALIBRATION_DATA = [
  {reviewer:'Priya Adhikari (HR Manager)',avg_rating_given:7.8,company_avg:6.9,bias_flag:'lenient'},
  {reviewer:'Dipesh Bhattarai (Finance Controller)',avg_rating_given:6.2,company_avg:6.9,bias_flag:'strict'},
  {reviewer:'Sushila Gurung (Ops Lead)',avg_rating_given:6.8,company_avg:6.9,bias_flag:'none'},
]

const MIN_REVIEWERS_FOR_ANONYMITY = 3

export default function PMS360Page() {
  const [activeTab, setActiveTab] = useState('radar')
  const [showRequestWizard, setShowRequestWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const incomingSubmitted = FEEDBACK_HUB.incoming.filter(f=>f.status==='submitted').length
  const outgoingPending = FEEDBACK_HUB.outgoing.filter(f=>f.status==='pending').length
  const biasedReviewers = CALIBRATION_DATA.filter(c=>c.bias_flag!=='none').length

  // Build radar polygon points (simple 4-axis avg per competency for the manager line, as example)
  const center = 140, radius = 100
  const angleStep = (2*Math.PI)/COMPETENCIES.length
  const toPoint = (value, i) => {
    const r = (value/10)*radius
    const angle = i*angleStep - Math.PI/2
    return [center+r*Math.cos(angle), center+r*Math.sin(angle)]
  }
  const selfPoints = COMPETENCIES.map((c,i)=>toPoint(c.self,i)).map(p=>p.join(',')).join(' ')
  const managerPoints = COMPETENCIES.map((c,i)=>toPoint(c.manager,i)).map(p=>p.join(',')).join(' ')

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="360 Degree PMS"
        breadcrumb="Performance & Talent Management > Goal & Performance > Goal Management"
        gradient={G}
        stats={[
          {icon:'📥',label:'Incoming Submitted', value:`${incomingSubmitted}/${FEEDBACK_HUB.incoming.length}`},
          {icon:'📤',label:'Outgoing Pending',    value:outgoingPending},
          {icon:'🎯',label:'IDP Items',           value:IDP_ITEMS.length},
          {icon:'⚖',label:'Calibration Flags',    value:biasedReviewers},
        ]}
        onAdd={()=>setShowRequestWizard(true)} addLabel="Request 360 Review"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#155e75',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Anonymity Guaranteed:</strong> Peer and direct-report feedback is only released once at least {MIN_REVIEWERS_FOR_ANONYMITY} reviewers have submitted - protecting individual identity in small teams. Manager feedback is always attributed.</div>
      </div>

      {/* Tab navigation */}
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',background:'#f1f5f9',padding:6,borderRadius:12}}>
        {[{key:'radar',label:'🎯 Competency Radar'},{key:'hub',label:'📨 Feedback Hub'},{key:'idp',label:'📈 Development Plan'},{key:'calibration',label:'⚖ Calibration (HR)'}].map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{padding:'8px 14px',borderRadius:9,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
              background:activeTab===t.key?'#fff':'transparent',color:activeTab===t.key?A:'#64748b',
              fontWeight:activeTab===t.key?700:500,boxShadow:activeTab===t.key?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab==='radar'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',display:'flex',flexWrap:'wrap',gap:20,justifyContent:'center'}}>
          <svg width="280" height="280" viewBox="0 0 280 280">
            {[0.25,0.5,0.75,1].map((scale,i)=>(
              <polygon key={i} points={COMPETENCIES.map((c,idx)=>toPoint(10*scale,idx).join(',')).join(' ')} fill="none" stroke="#e2e8f0" strokeWidth="1"/>
            ))}
            {COMPETENCIES.map((c,i)=>{
              const [x,y] = toPoint(10,i)
              return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1"/>
            })}
            <polygon points={selfPoints} fill={`${A}22`} stroke={A} strokeWidth="2"/>
            <polygon points={managerPoints} fill="#7c3aed22" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4,3"/>
            {COMPETENCIES.map((c,i)=>{
              return <text key={i} x={x} y={y} fontSize="9" fill="#475569" textAnchor="middle">{c.name}</text>
            })}
          </svg>
          <div style={{display:'flex',flexDirection:'column',gap:8,justifyContent:'center'}}>
            <div style={{display:'flex',gap:8,alignItems:'center',fontSize:11}}><span style={{width:14,height:3,background:A,display:'inline-block'}}/> Self-Rating</div>
            <div style={{display:'flex',gap:8,alignItems:'center',fontSize:11}}><span style={{width:14,height:3,background:'#7c3aed',display:'inline-block'}}/> Manager Rating</div>
            <div style={{fontSize:10,color:'#64748b',maxWidth:200,marginTop:8}}>Gaps between self and manager lines highlight blind spots - areas where perception differs most.</div>
          </div>
        </div>
      )}

      {activeTab==='hub'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 18px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📥 Incoming Feedback (about me)</div>
            {FEEDBACK_HUB.incoming.map((f,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<FEEDBACK_HUB.incoming.length-1?'1px solid #f8fafc':'none'}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{f.from} {f.anonymous&&<span style={{color:'#94a3b8'}}>🔒</span>}</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>{f.submitted_at||'Not yet submitted'}</div>
                </div>
                <span style={{background:f.status==='submitted'?'#f0fdf4':'#fffbeb',color:f.status==='submitted'?'#15803d':'#b45309',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{f.status==='submitted'?'✅ Submitted':'⏳ Pending'}</span>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 18px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📤 Outgoing Feedback (I owe others)</div>
            {FEEDBACK_HUB.outgoing.map((f,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<FEEDBACK_HUB.outgoing.length-1?'1px solid #f8fafc':'none'}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{f.about} <span style={{color:'#94a3b8'}}>({f.role})</span></div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>Due {f.due_date}</div>
                </div>
                {f.status==='pending'?<button style={{padding:'5px 12px',borderRadius:8,border:'none',background:A,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Fill Out</button>:<span style={{background:'#f0fdf4',color:'#15803d',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>✅ Done</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='idp'&&(
        <div style={{display:'grid',gap:14}}>
          {IDP_ITEMS.map((idp,i)=>(
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:idp.gap,impact_links:['Training Records','Goal Tracking']}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 18px',borderLeft:`5px solid ${A}`}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:4}}>{idp.gap}</div>
              <div style={{fontSize:10,color:'#64748b',marginBottom:10}}>{'>'} {idp.action}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:9}}>
                <span style={{color:'#94a3b8'}}>Target: {idp.target_date}</span><span style={{fontWeight:700,color:A}}>{idp.progress_pct}%</span>
              </div>
              <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${idp.progress_pct}%`,height:'100%',background:A,borderRadius:7}}/></div>
            </div>
          ))}
        </div>
      )}

      {activeTab==='calibration'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead><tr style={{background:'#f8fafc'}}>{['Reviewer','Avg Rating Given','Company Avg','Bias Flag'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>{h}</th>)}</tr></thead>
            <tbody>{CALIBRATION_DATA.map((c,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{c.reviewer}</td>
                <td style={{padding:'9px 12px',color:'#3b82f6'}}>{c.avg_rating_given}</td>
                <td style={{padding:'9px 12px',color:'#94a3b8'}}>{c.company_avg}</td>
                <td style={{padding:'9px 12px'}}>
                  {c.bias_flag==='none'?<span style={{color:'#10b981',fontSize:9,fontWeight:700}}>✓ Calibrated</span>:
                   <span style={{background:c.bias_flag==='lenient'?'#fffbeb':'#fef2f2',color:c.bias_flag==='lenient'?'#b45309':'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{c.bias_flag==='lenient'?'⚠ Lenient':'⚠ Strict'}</span>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {showRequestWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowRequestWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(560px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Request 360 Review</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Review Cycle" type="select" value="" onChange={()=>{}} accent={A} options={['Q3 2026 Mid-Cycle','Annual FY 2082/83']}/>
              <Field label="Select Evaluators (min. 3 for anonymity)" type="textarea" value="" onChange={()=>{}} accent={A} hint="Manager + 3 peers + 1 direct report recommended"/>
              <AIImpact color={A} lines={['Feedback released only once the 3-reviewer anonymity threshold is met.','Reminder notifications auto-sent to pending evaluators every 3 days.','Notification sent to the employee and their reporting manager once the cycle completes.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowRequestWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Send Requests</button>
                <button onClick={()=>setShowRequestWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="360 Degree PMS" columns={['Employee','Competency','Self Score','Peer Score','Manager Score','Report Score']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

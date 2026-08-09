// FILE: MyResignationPage.jsx - My Resignation
// (HR Services & Support > Employee Self Service)
// Guided wizard: last working day, reason, simultaneous notification to
// HR/manager/IT/Finance. Section 127: employer must acknowledge within
// 15 days or it's legally deemed accepted -- tracked as a hard countdown.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const MY_RESIGNATION = {
  submitted: true, submitted_at:'2025-06-15', last_working_day:'2025-07-15', reason:'Pursuing an opportunity abroad',
  acknowledgment_deadline:'2025-06-30', days_remaining:6, acknowledged:false,
  clearance_checklist:[
    {item:'IT Equipment Handover',status:'pending',owner:'IT Department'},
    {item:'Knowledge Transfer Document',status:'pending',owner:'Direct Manager'},
    {item:'Final Settlement Calculation',status:'not_started',owner:'Finance'},
    {item:'Exit Interview',status:'not_started',owner:'HR'},
  ],
}

export default function MyResignationPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [step, setStep] = useState(1)
  const [ctx, setCtx] = useState(null)
  const hasResigned = MY_RESIGNATION.submitted

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🚪" title="My Resignation"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={hasResigned?[
          {icon:'📅',label:'Last Working Day',  value:MY_RESIGNATION.last_working_day},
          {icon:'⏰',label:'Acknowledgment Due',    value:MY_RESIGNATION.days_remaining+' days'},
          {icon:'✅',label:'Clearance Items',          value:MY_RESIGNATION.clearance_checklist.length},
          {icon:'⚖',label:'Legal Basis',                value:'Section 127'},
        ]:[
          {icon:'📋',label:'Status',  value:'Not Submitted'},
        ]}
        onAdd={()=>!hasResigned&&setShowWizard(true)} addLabel={hasResigned?'':'Submit Resignation'}/>

      {!hasResigned?(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'40px 24px',textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:14}}>🚪</div>
          <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:8}}>Considering Leaving?</div>
          <div style={{fontSize:11,color:'#64748b',maxWidth:380,margin:'0 auto'}}>If you've made the decision, this guided wizard walks you through tendering formal, written notice -- exactly as required under Section 127.</div>
        </div>
      ):(<>
        <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
          <span style={{fontSize:18}}>⚖</span>
          <div style={{flex:1,minWidth:200}}><strong>The 15-Day Clock:</strong> Per Section 127, your employer must acknowledge or accept this resignation within 15 days of submission -- after which it is legally deemed accepted regardless.</div>
        </div>

        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px',marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:8}}>📜 Submitted Resignation</div>
          <div style={{fontSize:10,color:'#374151'}}>Submitted {MY_RESIGNATION.submitted_at} . "{MY_RESIGNATION.reason}"</div>
          <div style={{marginTop:10,fontSize:10,fontWeight:700,color:MY_RESIGNATION.days_remaining<=3?'#ef4444':'#15803d'}}>
            {MY_RESIGNATION.acknowledged?'✅ Acknowledged by Employer':`⏰ ${MY_RESIGNATION.days_remaining} days until automatic legal acceptance`}
          </div>
        </div>

        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>✅ Exit Clearance Checklist</div>
          {MY_RESIGNATION.clearance_checklist.map((c,i)=>(
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.item,...c,impact_links:['Exit Clearance']}})}}
              style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i<MY_RESIGNATION.clearance_checklist.length-1?'1px solid #f8fafc':'none'}}>
              <span style={{fontSize:10,color:'#374151'}}>{c.item} <span style={{color:'#94a3b8'}}>({c.owner})</span></span>
              <span style={{background:c.status==='pending'?'#fffbeb':'#f8fafc',color:c.status==='pending'?'#b45309':'#94a3b8',fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{c.status.replace('_',' ')}</span>
            </div>
          ))}
        </div>
      </>)}

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Step {step} of 2: {step===1?'Last Working Day':'Confirm & Submit'}</div></div>
            <div style={{padding:'20px 24px'}}>
              {step===1?(<>
                <Field label="Proposed Last Working Day" type="date" value="" onChange={()=>{}} accent={A}/>
                <Field label="Reason for Leaving" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
                <button onClick={()=>setStep(2)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Continue</button>
              </>):(<>
                <div style={{background:'#fef2f2',borderRadius:10,padding:'12px 14px',fontSize:10,color:'#991b1b',marginBottom:14}}>This formal notice will be simultaneously sent to HR, your direct manager, IT, and Finance. This action cannot be undone.</div>
                <button onClick={()=>{setShowWizard(false);setStep(1)}} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Confirm &amp; Submit Resignation</button>
              </>)}
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Submission instantly notifies HR, your manager, IT, and Finance simultaneously -- no one finds out late.','Clearance checklist auto-generates the moment resignation is acknowledged, with each item routed to the right owner.','The 15-day acknowledgment clock is tracked precisely and never silently missed.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

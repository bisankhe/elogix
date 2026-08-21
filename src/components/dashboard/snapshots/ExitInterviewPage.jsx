// FILE: ExitInterviewPage.jsx - Exit Interview (Exit Management)
// Neutral HR-conducted, AI sentiment analysis, anonymized aggregated trends

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const INTERVIEWS = [
  { id:'ei1', employee:'Dipendra Yadav', position:'Junior Accountant', interview_date:'2025-07-08',
    conducted_by:'Priya Adhikari (HR Manager - Neutral)', mode:'In-Person',
    responses:{overall_satisfaction:4,management_quality:3,growth_opportunities:2,compensation_fairness:3,would_recommend:4},
    sentiment:'mixed', sentiment_score:62, key_themes:['Limited growth path','Good team culture','Fair workload'],
    rehire_eligible:true, status:'completed',
    impact_links:['Knowledge Transfer','Employee Timeline'] },
  { id:'ei2', employee:'Anjali Sharma', position:'Sales Executive', interview_date:null,
    conducted_by:null, mode:'Pending Schedule',
    responses:{}, sentiment:null, sentiment_score:null, key_themes:[],
    rehire_eligible:null, status:'scheduled',
    impact_links:[] },
]

const SENTIMENT_CFG = {
  positive:{c:'#10b981',label:'Positive'}, mixed:{c:'#f59e0b',label:'Mixed'}, negative:{c:'#ef4444',label:'Negative'},
const STATUS_CFG = {completed:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Completed'},scheduled:{c:'#94a3b8',bg:'#f8fafc',icon:'📅',label:'Scheduled'}}

const AGGREGATE_TRENDS = [
  {theme:'Limited growth opportunities',mentions:14,trend:'up'},
  {theme:'Compensation below market',mentions:9,trend:'up'},
  {theme:'Good team culture',mentions:21,trend:'stable'},
  {theme:'Management communication gaps',mentions:7,trend:'down'},
]

export default function ExitInterviewPage() {
  const [interviews, setInterviews] = useState(INTERVIEWS)
  const [search, setSearch] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [showTrends, setShowTrends] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({employee:'',conducted_by:'Priya Adhikari (HR Manager)',interview_date:'',mode:'In-Person'})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = interviews.filter(i=>!search||i.employee.toLowerCase().includes(search.toLowerCase()))
  const completedCount = interviews.filter(i=>i.status==='completed').length
  const avgSentiment = interviews.filter(i=>i.sentiment_score).reduce((s,i)=>s+i.sentiment_score,0) / Math.max(interviews.filter(i=>i.sentiment_score).length,1)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎤" title="Exit Interview"
        breadcrumb="Employee Lifecycle > Offboarding > Exit Management"
        gradient={G}
        stats={[
          {icon:'🎤',label:'Total Interviews',  value:interviews.length},
          {icon:'✅',label:'Completed',          value:completedCount},
          {icon:'😐',label:'Avg Sentiment',      value:Math.round(avgSentiment)+'/100'},
          {icon:'👍',label:'Rehire Eligible',    value:interviews.filter(i=>i.rehire_eligible).length},
        ]}
        onAdd={()=>setShowSchedule(true)} addLabel="Schedule Interview"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'linear-gradient(135deg,#faf5ff,#f5f3ff)',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔒</span>
        <div><strong>Neutral & Confidential:</strong> Conducted by a neutral HR professional - never the direct manager - to encourage honest feedback. AI sentiment analysis surfaces themes for leadership while keeping individual responses confidential. No legal mandate in Nepal, but standard best practice.</div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <button onClick={()=>setShowTrends(!showTrends)} style={{padding:'9px 16px',borderRadius:9,border:`1.5px solid ${A}`,background:showTrends?A:'#fff',color:showTrends?'#fff':A,fontSize:11,fontWeight:700,cursor:'pointer'}}>
          📊 {showTrends?'Hide':'View'} Aggregate Trends
        </button>
      </div>

      {showTrends&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px',marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🤖 AI-Aggregated Turnover Themes (Anonymized, Org-Wide)</div>
          {AGGREGATE_TRENDS.map((t,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<AGGREGATE_TRENDS.length-1?'1px solid #f8fafc':'none'}}>
              <span style={{fontSize:11,color:'#374151'}}>{t.theme}</span>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:10,fontWeight:700,color:A}}>{t.mentions} mentions</span>
                <span style={{fontSize:12}}>{t.trend==='up'?'📈':t.trend==='down'?'📉':'➡'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'grid',gap:14}}>
        {filtered.map(i=>{
          const sc = STATUS_CFG[i.status]
          const sent = SENTIMENT_CFG[i.sentiment]
          return (
            <div key={i.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:i.employee,...i}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{i.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {sent&&<span style={{background:`${sent.c}15`,color:sent.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sent.label} Sentiment</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{i.position} . {i.mode}</div>
                  {i.conducted_by&&<div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Conducted by: {i.conducted_by} . {i.interview_date}</div>}
                </div>
                {i.sentiment_score&&(
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:i.sentiment_score>=70?'#10b981':i.sentiment_score>=50?'#f59e0b':'#ef4444'}}>{i.sentiment_score}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>SENTIMENT /100</div>
                  </div>
                )}
              </div>

              {i.status==='completed'&&(
                <>
                  <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                    {Object.entries(i.responses).map(([k,v])=>(
                      <div key={k} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                        <div style={{fontSize:14,fontWeight:900,color:v>=4?'#10b981':v>=3?'#f59e0b':'#ef4444'}}>{v}/5</div>
                        <div style={{fontSize:7,color:'#94a3b8',fontWeight:600,lineHeight:1.2}}>{k.replace(/_/g,' ')}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{padding:'10px 20px',display:'flex',gap:5,flexWrap:'wrap'}}>
                    {i.key_themes.map((t,idx)=><span key={idx} style={{background:`${A}10`,color:A,fontSize:9,padding:'2px 9px',borderRadius:20}}>{t}</span>)}
                  </div>
                </>
              )}
              {i.status==='scheduled'&&(
                <div style={{padding:'12px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:10,color:'#94a3b8'}}>Interview not yet conducted.</span>
                  <button onClick={()=>setShowSchedule(true)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Schedule Now</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showSchedule&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSchedule(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Schedule Exit Interview</div></div>
            <div style={{padding:'22px 28px'}}>
              {/* Ethical gate: require exit interview before F&F */}
              <div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:10,color:'#92400e'}}>
                ⚠️ <strong>F&F Gate:</strong> Full & Final Settlement CANNOT be initiated without a completed exit interview. This ensures honest feedback and compliance.
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:12}}>
                {[['Employee Name *','employee','text'],['Interview Date *','interview_date','date']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Conducted By (Neutral HR)</label>
                  <select value={form.conducted_by} onChange={e=>setForm(p=>({...p,conducted_by:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {['Priya Adhikari (HR Manager)','Sita Khadka (HR BP)','Neutral HR Consultant'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Mode</label>
                  <select value={form.mode} onChange={e=>setForm(p=>({...p,mode:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {['In-Person','Video Call','AI Conversational Bot','Written Questionnaire'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              {/* Ethical exit interview questions preview */}
              <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'12px 14px',marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:'#4c1d95',marginBottom:8}}>📋 Ethical Exit Interview Questions (AI-Generated, Neutral)</div>
                {['What were the primary reasons for your decision to leave?',
                  'What did you enjoy most about working here?',
                  'What could the company have done differently to retain you?',
                  'How would you describe your relationship with your direct manager?',
                  'Were your skills and abilities utilized effectively?',
                  'What suggestions do you have for improving the workplace?',
                  'Would you consider returning to the company in the future? Why or why not?',
                  'How likely are you to recommend this company to others as an employer? (1-10)',
                ].map((q,i)=>(
                  <div key={i} style={{display:'flex',gap:8,fontSize:9,color:'#475569',padding:'4px 0',borderBottom:'1px solid #ede9fe'}}>
                    <span style={{color:'#7c3aed',fontWeight:700,flexShrink:0}}>Q{i+1}.</span><span>{q}</span>
                  </div>
                ))}
              </div>
              <AIImpact color={A} lines={['Never assign the direct manager - preserves honesty.','AI bot mode available for asynchronous, judgment-free feedback.','Real-time sentiment analysis runs during/after interview.','Aggregated, anonymized themes shared with leadership only.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.employee||!form.interview_date){notify('⚠️ Employee and interview date required');return}
                  setInterviews(prev=>[...prev,{id:'ei'+Date.now(),employee:form.employee,position:'Staff',interview_date:form.interview_date,conducted_by:form.conducted_by,mode:form.mode,responses:{},sentiment:null,sentiment_score:null,key_themes:[],rehire_eligible:null,status:'scheduled',impact_links:[]}])
                  notify('✅ Exit interview scheduled for '+form.employee+' — calendar invite sent')
                  setShowSchedule(false)
                  setForm({employee:'',conducted_by:'Priya Adhikari (HR Manager)',interview_date:'',mode:'In-Person'})
                }} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>📅 Schedule Exit Interview</button>
                <button onClick={()=>setShowSchedule(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Responses',key:'view'},{icon:'📅',label:'Schedule',key:'schedule'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export (Anonymized)',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Exit Interviews" columns={['Employee','Position','Interview Date','Conducted By','Sentiment','Sentiment Score','Rehire Eligible','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

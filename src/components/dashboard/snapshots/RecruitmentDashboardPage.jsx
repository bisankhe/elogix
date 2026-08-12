// FILE: RecruitmentDashboardPage.jsx
// Recruitment Command Center — Real-time KPIs, pipeline funnel, persona-aware
// Personas: Super Admin, Executive, HR Manager, Recruitment Agency

import { useState } from 'react'
import { ExcelModal, PageHeader, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#3b82f6 100%)'
const A = '#1e40af'

const PERSONA_DATA = {
  executive: {
    label:'Executive View',
    kpis:[
      {icon:'⏱',label:'Avg Time-to-Hire',    value:'18 days',  trend:'+2',  trendUp:false, color:'#ef4444'},
      {icon:'💰',label:'Cost-per-Hire',        value:'NPR 45K',  trend:'-8%', trendUp:true,  color:'#10b981'},
      {icon:'🎯',label:'Quality-of-Hire',      value:'82%',      trend:'+4%', trendUp:true,  color:'#3b82f6'},
      {icon:'✅',label:'Offer Accept Rate',    value:'87%',      trend:'+3%', trendUp:true,  color:'#10b981'},
    ]
  },
  hr_manager: {
    label:'HR Manager View',
    kpis:[
      {icon:'📋',label:'Active Requisitions',  value:'24',       trend:'+3',  trendUp:false, color:'#f59e0b'},
      {icon:'👤',label:'Candidates in Pipeline',value:'312',     trend:'+47', trendUp:true,  color:'#3b82f6'},
      {icon:'📅',label:'Interviews This Week', value:'28',       trend:'+6',  trendUp:true,  color:'#8b5cf6'},
      {icon:'📧',label:'Pending Responses',    value:'19',       trend:'-5',  trendUp:true,  color:'#10b981'},
    ]
  },
  recruiter: {
    label:'Recruiter View',
    kpis:[
      {icon:'🔥',label:'Open Roles Assigned',  value:'8',        trend:'+1',  trendUp:false, color:'#ef4444'},
      {icon:'📬',label:'CVs to Review Today',  value:'43',       trend:'+12', trendUp:false, color:'#f59e0b'},
      {icon:'🤖',label:'AI Screened Today',     value:'127',      trend:'',    trendUp:true,  color:'#8b5cf6'},
      {icon:'⏰',label:'SLA at Risk',           value:'3 roles',  trend:'',    trendUp:false, color:'#ef4444'},
    ]
  },
}

const PIPELINE_STAGES = [
  {stage:'Applied',      count:312, color:'#3b82f6', icon:'📬'},
  {stage:'AI Screened',  count:187, color:'#8b5cf6', icon:'🤖'},
  {stage:'Written Test', count:98,  color:'#f59e0b', icon:'📝'},
  {stage:'Video Interview',count:54,color:'#06b6d4', icon:'🎥'},
  {stage:'Panel Interview',count:28,color:'#10b981', icon:'👥'},
  {stage:'HR Review',    count:14,  color:'#ec4899', icon:'💼'},
  {stage:'Offer Sent',   count:8,   color:'#f97316', icon:'📋'},
  {stage:'Hired',        count:5,   color:'#10b981', icon:'✅'},
]

const ACTIVE_REQS = [
  {id:'MR-2025-041',role:'Senior Developer',dept:'IT',branch:'KTM',applied:47,screened:28,stage:'Interview',sla_days:18,sla_ok:true,ai_top:3},
  {id:'MR-2025-038',role:'Finance Manager',dept:'Finance',branch:'KTM',applied:32,screened:18,stage:'Written Test',sla_days:24,sla_ok:false,ai_top:5},
  {id:'MR-2025-035',role:'Security Guard x5',dept:'Facilities',branch:'PKR',applied:89,screened:45,stage:'AI Screening',sla_days:12,sla_ok:true,ai_top:10},
  {id:'MR-2025-033',role:'HR Business Partner',dept:'HR',branch:'KTM',applied:28,screened:14,stage:'Panel',sla_days:31,sla_ok:false,ai_top:2},
  {id:'MR-2025-030',role:'Sales Executive x3',dept:'Sales',branch:'BRT',applied:64,screened:31,stage:'Offer',sla_days:8,sla_ok:true,ai_top:4},
]

const SOURCE_DATA = [
  {source:'LinkedIn',count:98,pct:31,color:'#0369a1'},
  {source:'MoLESS Portal',count:72,pct:23,color:'#7c3aed'},
  {source:'Company Website',count:68,pct:22,color:'#0891b2'},
  {source:'Newspaper Ad',count:47,pct:15,color:'#d97706'},
  {source:'Referral',count:27,pct:9,color:'#10b981'},
]

const CTX = [
  {icon:'👁',label:'View Full Pipeline',     key:'view'},
  {icon:'📋',label:'Go to Requisition',      key:'req'},
  {icon:'🤖',label:'Run AI Screening',       key:'ai'},
  {icon:'📧',label:'Send Bulk Status Email', key:'email'},
  {icon:'📊',label:'Export Report',          key:'export'},
  {icon:'🔗',label:'Impact Analysis',        key:'impact'},
]

export default function RecruitmentDashboardPage() {
  const [persona, setPersona] = useState('hr_manager')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState('')
  const [reqForm, setReqForm] = useState({role:'',dept:'IT',positions:'1',type:'regular',urgency:'high',justification:''})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const pd = PERSONA_DATA[persona] || PERSONA_DATA.hr_manager
  const maxPipeline = PIPELINE_STAGES[0].count

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎯" title="Recruitment Dashboard"
        breadcrumb="Employee Lifecycle > Recruitment & Hiring > Recruitment Management"
        gradient={G}
        stats={pd.kpis.map(k=>({icon:k.icon,label:k.label,value:k.value}))}
        onAdd={()=>setShowAdd(true)} addLabel="+ New Requisition"
        onExcel={()=>setShowExcel(true)}/>

      {/* Persona switcher */}
      <div style={{display:'flex',gap:6,marginBottom:16,padding:'4px',background:'#f1f5f9',borderRadius:12,width:'fit-content'}}>
        {[{id:'executive',label:'Executive'},
          {id:'hr_manager',label:'HR Manager'},
          {id:'recruiter',label:'Recruiter'}].map(p=>(
          <button key={p.id} onClick={()=>setPersona(p.id)}
            style={{padding:'8px 18px',borderRadius:9,border:'none',cursor:'pointer',fontSize:11,fontWeight:persona===p.id?700:400,
              background:persona===p.id?A:'transparent',color:persona===p.id?'#fff':'#64748b',
              transition:'all .15s ease'}}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
        {/* Pipeline Funnel */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px 24px'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:16}}>Candidate Pipeline Funnel</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {PIPELINE_STAGES.map((s,i)=>{
              const w = Math.round(s.count/maxPipeline*100)
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:14,width:20}}>{s.icon}</span>
                  <div style={{width:120,fontSize:11,color:'#475569',fontWeight:600}}>{s.stage}</div>
                  <div style={{flex:1,height:28,background:'#f8fafc',borderRadius:8,overflow:'hidden',position:'relative'}}>
                    <div style={{width:`${w}%`,height:'100%',background:`${s.color}22`,borderRadius:8,display:'flex',alignItems:'center',paddingLeft:10,
                      borderLeft:`3px solid ${s.color}`,transition:'width .7s ease'}}>
                      <span style={{fontSize:12,fontWeight:800,color:s.color}}>{s.count}</span>
                    </div>
                  </div>
                  <span style={{fontSize:10,color:'#94a3b8',width:40,textAlign:'right'}}>{Math.round(s.count/maxPipeline*100)}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Source of Hire */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px 24px'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:16}}>Source of Hire</div>
          {SOURCE_DATA.map((s,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:11}}>
                <span style={{color:'#475569',fontWeight:600}}>{s.source}</span>
                <span style={{fontWeight:800,color:s.color}}>{s.count}</span>
              </div>
              <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                <div style={{width:`${s.pct}%`,height:'100%',background:`linear-gradient(90deg,${s.color},${s.color}88)`,borderRadius:8}}/>
              </div>
            </div>
          ))}
          <div style={{marginTop:12,padding:'10px 12px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:10,color:'#92400e'}}>
            Nepal LA2074: Vacancies must be posted on <strong>MoLESS portal + national newspaper</strong>
          </div>
        </div>
      </div>

      {/* Active Requisitions Table */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>Active Requisitions</div>
          <div style={{display:'flex',gap:6}}>
            <span style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20}}>3 SLA at Risk</span>
            <span style={{background:'#f0fdf4',color:'#15803d',border:'1px solid #bbf7d0',fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20}}>🤖 AI Running</span>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{background:'linear-gradient(135deg,#eff6ff,#f5f3ff)'}}>
                {['Req. ID','Role','Dept','Branch','Applied','Screened','Stage','SLA','AI Top','Actions'].map(h=>(
                  <th key={h} style={{padding:'11px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:A,borderBottom:`2px solid ${A}22`,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIVE_REQS.map(r=>(
                <tr key={r.id}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.role,...r}})}}
                  style={{borderBottom:'1px solid #f8fafc'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:10,fontWeight:700,color:A}}>{r.id}</td>
                  <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{r.role}</td>
                  <td style={{padding:'10px 12px'}}><span style={{background:`${A}12`,color:A,fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:600}}>{r.dept}</span></td>
                  <td style={{padding:'10px 12px',color:'#64748b',fontSize:10}}>{r.branch}</td>
                  <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:'#3b82f6'}}>{r.applied}</td>
                  <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,color:'#8b5cf6'}}>{r.screened}</td>
                  <td style={{padding:'10px 12px'}}><span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{r.stage}</span></td>
                  <td style={{padding:'10px 12px'}}>
                    <span style={{color:r.sla_ok?'#10b981':'#ef4444',fontWeight:700,fontSize:11}}>{r.sla_days}d {r.sla_ok?'✓':'⚠'}</span>
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'center'}}>
                    <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>Top {r.ai_top}</span>
                  </td>
                  <td style={{padding:'10px 12px',display:'flex',gap:4}}>
                    <button style={{padding:'4px 8px',borderRadius:6,border:'none',background:G,color:'#fff',fontSize:9,cursor:'pointer',fontWeight:700}}>Pipeline</button>
                    <button style={{padding:'4px 8px',borderRadius:6,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:9,cursor:'pointer'}}>ATS</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)'}}>{msg}</div>}

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px',borderRadius:'20px 20px 0 0'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📋 New Manpower Requisition</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>Fill details — routes to Dept Head → Finance → HR for approval</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                {[['Role / Position Title *','role','text'],['No. of Positions','positions','number']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={reqForm[f]} onChange={e=>setReqForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                {[['Department','dept',['IT','Finance','HR','Sales','Operations','Facilities']],['Employment Type','type',['regular','time_bound','work_based','casual','outsource']],['Urgency','urgency',['critical','high','medium','low']]].map(([l,f,opts])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <select value={reqForm[f]} onChange={e=>setReqForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                      {opts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Justification *</label>
                <textarea value={reqForm.justification} onChange={e=>setReqForm(p=>({...p,justification:e.target.value}))} rows={3}
                  placeholder="Why is this position needed? (backfill, expansion, new project...)"
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
              <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:10,color:'#1e40af'}}>
                ⚖️ <strong>Nepal LA2074:</strong> Vacancy will be auto-posted to MoLESS portal + national newspaper on approval. Approval flow: Dept Head → Finance → HR Manager.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{if(!reqForm.role){notify('⚠️ Role title required');return}notify('✅ Requisition MR-'+Date.now().toString().slice(-5)+' submitted — routed to '+reqForm.dept+' Head for approval');setShowAdd(false);setReqForm({role:'',dept:'IT',positions:'1',type:'regular',urgency:'high',justification:''})}}
                  style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer'}}>📋 Submit Requisition</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',fontSize:12,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={['ATS Dashboard','Vacancy Management','Manpower Requisition','Candidate Database']} actions={CTX} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Recruitment Dashboard" columns={['Req ID','Role','Dept','Applied','Screened','Stage','SLA Days','Hired']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

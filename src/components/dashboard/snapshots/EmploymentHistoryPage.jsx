// FILE: EmploymentHistoryPage.jsx - Employment History (Employee Database)
// Digital-resume timeline: roles, promotions, transfers, manager changes, compensation

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const HISTORY = [
  { id:'h1', date:'2025-06-16', event_type:'hire', title:'Cloud Architect', dept:'Information Technology',
    manager:'Rajesh Sharma', salary_npr:180000, classification:'Regular', note:'Joined NepHR Pro as Cloud Architect.',
    expanded_detail:'Hired through standard recruitment pipeline (JRF-2025-005). AI screening score: 97%. Offer accepted within 2 days.' },
]

const TYPE_CFG = {
  hire:{c:'#10b981',icon:'🎉',label:'Hired'},
  promotion:{c:'#7c3aed',icon:'📈',label:'Promotion'},
  transfer:{c:'#3b82f6',icon:'🔄',label:'Transfer'},
  salary_change:{c:'#f59e0b',icon:'💰',label:'Salary Change'},
  manager_change:{c:'#ec4899',icon:'👔',label:'Manager Change'},
  confirmation:{c:'#06b6d4',icon:'✅',label:'Confirmed Permanent'},
}

export default function EmploymentHistoryPage() {
  const [history] = useState(HISTORY)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [showExcel, setShowExcel] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📜" title="Employment History"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Database"
        gradient={G}
        stats={[
          {icon:'📜',label:'Total Events',     value:history.length},
          {icon:'📅',label:'Tenure',           value:'2 weeks'},
          {icon:'💰',label:'Current Salary',   value:'NPR 180K'},
          {icon:'🏢',label:'Current Dept',     value:'IT'},
        ]}
        onAdd={()=>notify('📋 Employment history entry created')} addLabel="+ Add Entry" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Compliance:</strong> Labour Act 2074 requires records documenting initial appointment date, employment type, current position, and all subsequent promotions/role changes/transfers - retained for the statutory period for audit and dispute-defense purposes.</div>
      </div>

      {/* Timeline */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,padding:'24px 28px'}}>
        <div style={{position:'relative',paddingLeft:32}}>
          <div style={{position:'absolute',left:11,top:8,bottom:8,width:2,background:'#e2e8f0'}}/>
          {history.map((h,i)=>{
            const tc = TYPE_CFG[h.event_type]
            const isExpanded = expanded===h.id
            return (
              <div key={h.id} style={{position:'relative',marginBottom:i<history.length-1?24:0}}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:h.title,impact_links:['Employee Profile']}})}}>
                <div style={{position:'absolute',left:-32,top:2,width:24,height:24,borderRadius:'50%',background:tc.c,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#fff',border:'3px solid #fff',boxShadow:`0 0 0 2px ${tc.c}33`}}>
                  {tc.icon}
                </div>
                <div onClick={()=>setExpanded(isExpanded?null:h.id)}
                  style={{background:'#f8fafc',borderRadius:14,padding:'14px 18px',cursor:'pointer',border:`1px solid ${tc.c}22`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                    <div>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{h.title}</span>
                        <span style={{background:`${tc.c}15`,color:tc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{tc.label}</span>
                      </div>
                      <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{h.dept} . {h.classification} . {h.date}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:12,fontWeight:800,color:'#10b981'}}>NPR {h.salary_npr.toLocaleString()}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>{isExpanded?'▲ Less':'▼ More'}</div>
                    </div>
                  </div>
                  {isExpanded&&(
                    <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #e2e8f0',fontSize:11,color:'#374151',lineHeight:1.6}}>
                      <div style={{marginBottom:4}}><strong>Manager:</strong> {h.manager}</div>
                      <div style={{marginBottom:4}}><strong>Note:</strong> {h.note}</div>
                      <div style={{color:'#64748b',fontStyle:'italic'}}>{h.expanded_detail}</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>Add Employment Event</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
          <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Event Type</label><select value={form.event_type||''} onChange={e=>setForm(p=>({...p,event_type:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['promotion','transfer','salary_change','manager_change','confirmation'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
          <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Effective Date</label><input type="date" value={form.effective_date||''} onChange={e=>setForm(p=>({...p,effective_date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
          <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>New Title/Position</label><input type="text" value={form.new_titleposition||''} onChange={e=>setForm(p=>({...p,new_titleposition:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
          <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>New Salary (NPR)</label><input type="number" value={form.new_salary_npr||''} onChange={e=>setForm(p=>({...p,new_salary_npr:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
        </div>
        <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Note</label><textarea value={form.note||''} onChange={e=>setForm(p=>({...p,note:e.target.value}))} rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
        <AIImpact color={A} lines={['Auto-creates immutable historical timeline entry.','Salary changes sync to Payroll module.','Manager changes update org chart and reporting lines.']}/>
        <button style={{padding:13,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',width:'100%'}}>Record Event</button>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Record',key:'view'},{icon:'📤',label:'Export',key:'export'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Employment History" columns={['Date','Event Type','Title','Department','Manager','Salary NPR','Note']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

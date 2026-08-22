// FILE: SystemSettingPage.jsx - System Setting (System Settings)
// Global system configuration -- timezone, locale, email/SMS defaults,
// feature flags, API keys. The "tabbed settings panel" the brief
// describes as the final consolidation point.
import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'
const G='linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A='#334155'
const TABS=['Localization','Notifications','Integrations','Feature Flags','Legal & Compliance']
const GLOBAL_SETTINGS=[
  {key:'Default Timezone',value:'Asia/Kathmandu (UTC+5:45)'},
  {key:'Date Format',value:'DD-MM-YYYY'},
  {key:'Currency',value:'NPR (Nepalese Rupee)'},
  {key:'Default Language',value:'English (en-US)'},
  {key:'Fiscal Year Start',value:'Shrawan 1 (mid-July)'},
  {key:'Labour Audit Deadline',value:'End of Poush (mid-January)'},
]
export default function SystemSettingPage(){
  const [tab,setTab]=useState(0)
  const [ctx,setCtx]=useState(null)
  return(
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚙" title="System Setting" breadcrumb="System Administration > System Settings" gradient={G}
        stats={[{icon:'⚙',label:'Config Sections',value:TABS.length},{icon:'🌍',label:'Timezone',value:'UTC+5:45'},{icon:'📅',label:'Fiscal Year',value:'Nepali BS'},{icon:'🏳️',label:'Feature Flags',value:'12 Active'}]}
        onAdd={()=>{}} addLabel=""/>
      <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚙</span>
        <div style={{flex:1}}><strong>Global First, Regional Override:</strong> These settings apply to all tenants by default. Individual tenants can override specific values (e.g., a branch in a different timezone) without breaking the global policy.</div>
      </div>
      <div style={{display:'flex',gap:0,marginBottom:16,background:'#f1f5f9',borderRadius:10,padding:3,flexWrap:'wrap'}}>
        {TABS.map((t,i)=><button key={i} onClick={()=>setTab(i)} style={{flex:1,minWidth:100,padding:'7px 4px',border:'none',borderRadius:8,cursor:'pointer',fontSize:8,fontWeight:700,background:tab===i?'#fff':'transparent',color:tab===i?A:'#94a3b8',boxShadow:tab===i?'0 1px 3px rgba(0,0,0,.08)':'none'}}>{t}</button>)}
      </div>
      {tab===0&&(
        <div style={{display:'grid',gap:10}}>
          {GLOBAL_SETTINGS.map((s,i)=>(
            <div key={i} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.key,...s}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'12px 16px',display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:10,fontWeight:600,color:'#374151'}}>{s.key}</span>
              <span style={{fontSize:9,color:'#64748b'}}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
      {tab!==0&&<div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'20px',textAlign:'center',fontSize:10,color:'#94a3b8'}}>{TABS[tab]} settings -- configure here</div>}
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Feature flags let new modules be enabled per tenant without a deployment -- a client in pilot gets the feature; others don\'t see it yet.','Nepali fiscal year (Shrawan-to-Ashadh) and Poush audit deadline are pre-configured -- never a manual calculation at year-end.','All setting changes cascade to sub-tenants immediately, with override records logged so regional exceptions are always traceable back to who approved them.']}/>
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={[]} actions={[{icon:'⚙',label:'Edit Setting',key:'view'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

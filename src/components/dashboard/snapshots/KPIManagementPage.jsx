// FILE: KPIManagementPage.jsx - KPI Management (Performance & Talent > Goal & Performance > Goal Management)
// KPIs sit underneath KRAs (1-3 per KRA, SMART, formula-driven). Health-meter
// widgets, color-coded on-track/at-risk/off-track, role-based KPI matrix
// (Exec/Manager/HR/Employee), API-fed live metrics, self-service tracker.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const ROLE_KPI_PRESETS = {
  Executive: ['Human Capital ROI','eNPS','Time-to-Fill','90-Day Turnover Rate'],
  'Line Manager': ['Team Goal Completion Rate (OKRs)','Department Overtime Cost','Skill Gap / Training Completion'],
  'HR Admin': ['Payroll Accuracy Rate','Compliance Audit Pass Rate','Benefits Enrollment Penetration'],
  Employee: ['Individual KPI Progress','Training Completion Status','Leave Balance Accrual'],

const KPIS = [
  { id:'p1', kpi_title:'Close $500K ARR Pipeline', kra_parent:'Revenue Generation & Client Retention',
    formula:'Closed Deals Value (USD)', target_value:500000, current_value:410000, unit:'USD',
    data_source:'Salesforce (API-synced)', status:'on_track', role_tier:'Line Manager',
    impact_links:['KRA Management','Bonus Processing'] },
  { id:'p2', kpi_title:'Maintain Net Revenue Retention', kra_parent:'Revenue Generation & Client Retention',
    formula:'(Starting ARR - Churn + Expansion) / Starting ARR', target_value:95, current_value:98, unit:'%',
    data_source:'Salesforce (API-synced)', status:'on_track', role_tier:'Line Manager',
    impact_links:[] },
  { id:'p3', kpi_title:'Upskill 4 Direct Reports - Cloud Cert', kra_parent:'Team Capability & Leadership Growth',
    formula:'Certified Count / Target Count', target_value:4, current_value:1, unit:'people',
    data_source:'LMS (manual entry)', status:'at_risk', role_tier:'Line Manager',
    impact_links:['Training Records'] },
  { id:'p4', kpi_title:'Payroll Accuracy Rate', kra_parent:'HR Operational Excellence',
    formula:'1 - (Discrepancies / Total Payslips)', target_value:99.5, current_value:99.7, unit:'%',
    data_source:'Payroll Register (auto)', status:'on_track', role_tier:'HR Admin',
    impact_links:['Automated Payroll'] },
  { id:'p5', kpi_title:'Compliance Audit Pass Rate', kra_parent:'HR Operational Excellence',
    formula:'Passed Checks / Total Checks', target_value:100, current_value:87, unit:'%',
    data_source:'Tax & Compliance (auto)', status:'off_track', role_tier:'HR Admin',
    impact_links:['Tax & Compliance'] },
]

const STATUS_CFG = {
  on_track:{c:'#10b981',bg:'#f0fdf4',icon:'🟢',label:'On Track'},
  at_risk:{c:'#f59e0b',bg:'#fffbeb',icon:'🟡',label:'At Risk'},
  off_track:{c:'#ef4444',bg:'#fef2f2',icon:'🔴',label:'Off Track'},

export default function KPIManagementPage() {
  const [kpis, setKpis] = useState(KPIS)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = kpis.filter(k=>{
    if (filterRole!=='all'&&k.role_tier!==filterRole) return false
    if (search&&!k.kpi_title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const onTrackCount = kpis.filter(k=>k.status==='on_track').length
  const offTrackCount = kpis.filter(k=>k.status==='off_track').length
  const apiSyncedCount = kpis.filter(k=>k.data_source.includes('API') || k.data_source.includes('auto')).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="KPI Management"
        breadcrumb="Performance & Talent Management > Goal & Performance > Goal Management"
        gradient={G}
        stats={[
          {icon:'📊',label:'Active KPIs',     value:kpis.length},
          {icon:'🟢',label:'On Track',         value:onTrackCount},
          {icon:'🔴',label:'Off Track',         value:offTrackCount},
          {icon:'🔗',label:'Auto-Synced',       value:apiSyncedCount},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Define New KPI"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📐</span>
        <div style={{flex:1,minWidth:200}}><strong>KPIs Sit Underneath KRAs:</strong> Each KRA carries 1-3 SMART KPIs as quantifiable proof of progress. Auto-synced KPIs pull live from Salesforce, payroll, or compliance modules - manual-entry KPIs require periodic self-service updates.</div>
      </div>

      {/* Role-based KPI matrix quick filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search KPIs by title..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all',...Object.keys(ROLE_KPI_PRESETS)].map(r=>(
            <button key={r} onClick={()=>setFilterRole(r)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
                background:filterRole===r?'#fff':'transparent',color:filterRole===r?A:'#64748b',
                fontWeight:filterRole===r?700:400,boxShadow:filterRole===r?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {r==='all'?'All Roles':r}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(k=>{
          const sc = STATUS_CFG[k.status]
          const progressPct = Math.min(Math.round(k.current_value/k.target_value*100),150)
          return (
            <div key={k.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:k.kpi_title,...k}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{k.kpi_title}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>↳ KRA: {k.kra_parent} . {k.role_tier}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2,fontFamily:'monospace'}}>{k.formula}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:sc.c}}>{k.current_value.toLocaleString()}{k.unit==='%'?'%':''}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>of {k.target_value.toLocaleString()}{k.unit==='%'?'%':' '+k.unit} target</div>
                </div>
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                  <div style={{width:`${Math.min(progressPct,100)}%`,height:'100%',background:sc.c,borderRadius:8}}/>
                </div>
              </div>
              <div style={{padding:'8px 18px',fontSize:9,color:'#94a3b8',display:'flex',gap:8,alignItems:'center'}}>
                {(k.data_source.includes('API')||k.data_source.includes('auto'))?<span style={{color:'#10b981',fontWeight:700}}>🔗 {k.data_source}</span>:<span>✏ {k.data_source}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(600px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Define New KPI</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>Must link to a parent KRA - max 3 KPIs per KRA recommended.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Parent KRA" type="select" value="" onChange={()=>{}} accent={A} options={['Revenue Generation & Client Retention','Team Capability & Leadership Growth','HR Operational Excellence']}/>
                <Field label="Role Tier" type="select" value="" onChange={()=>{}} accent={A} options={Object.keys(ROLE_KPI_PRESETS)}/>
              </div>
              <Field label="KPI Title" value="" onChange={()=>{}} accent={A} required hint="SMART: Specific, Measurable, Achievable, Relevant, Time-bound"/>
              <Field label="Formula / Calculation" value="" onChange={()=>{}} accent={A} hint="e.g. Closed Deals Value (USD)"/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Target Value" type="number" value="" onChange={()=>{}} accent={A} required/>
                <Field label="Data Source" type="select" value="" onChange={()=>{}} accent={A} options={['Manual Entry','Salesforce (API)','Payroll Register (auto)','LMS (manual)','Attendance Module (auto)']}/>
              </div>
              <AIImpact color={A} lines={['Recommended: 1-3 KPIs per KRA to avoid analysis paralysis.','API-synced KPIs auto-update - no manual data entry needed.','Notification sent to the KPI owner and their reporting manager once published.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Publish KPI</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Trend History',key:'view'},{icon:'✏',label:'Update Value',key:'update'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="KPI Management" columns={['KPI Title','Parent KRA','Formula','Target','Current','Unit','Data Source','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

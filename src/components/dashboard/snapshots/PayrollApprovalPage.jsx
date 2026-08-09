// FILE: PayrollApprovalPage.jsx - Payroll Approval (Payroll Finalization)
// 4-level maker-checker state machine: Processor -> HR Manager -> Finance
// Controller -> CFO. Variance/exception grid, audit trail, single-click sign-off.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const APPROVAL_LEVELS = [
  {level:1,role:'Payroll Processor (Maker)',name:'Sushila Gurung',status:'complete',action_at:'2025-06-20 10:00 AM'},
  {level:2,role:'HR Manager',name:'Priya Adhikari',status:'complete',action_at:'2025-06-20 02:30 PM'},
  {level:3,role:'Finance Controller',name:'Dipesh Bhattarai',status:'in_progress',action_at:null},
  {level:4,role:'CFO (Final Signatory)',name:'Rajan Shrestha',status:'pending',action_at:null},
]

const EXCEPTIONS = [
  { id:'ex1', employee:'Bikash Rai', type:'Overtime Spike', detail:'OT hours 220% above 3-month average - verify against approved OT requests.', severity:'high', impact_links:['Overtime Calculation'] },
  { id:'ex2', employee:'Sunil Magar', type:'New Hire - Pro-Rated', detail:'Joined mid-month, first payroll cycle - prorated salary calculation applied.', severity:'low', impact_links:['Employee Joining'] },
  { id:'ex3', employee:'Hari Thapa', type:'Retroactive Adjustment', detail:'NPR 4,200 backpay adjustment from grade increment effective last month.', severity:'medium', impact_links:['Salary Structure'] },
]

const STATUS_CFG = {complete:{c:'#10b981',icon:'✅'},in_progress:{c:'#f59e0b',icon:'🔄'},pending:{c:'#94a3b8',icon:'⏳'}}
const SEVERITY_CFG = {high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'},low:{c:'#10b981',bg:'#f0fdf4'}}

export default function PayrollApprovalPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = EXCEPTIONS.filter(e=>!search||e.employee.toLowerCase().includes(search.toLowerCase()))
  const highSeverity = EXCEPTIONS.filter(e=>e.severity==='high').length
  const currentLevel = APPROVAL_LEVELS.find(l=>l.status==='in_progress')

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="✅" title="Payroll Approval"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Finalization"
        gradient={G}
        stats={[
          {icon:'🔄',label:'Current Level',     value:'Level '+(currentLevel?.level||4)},
          {icon:'⚠',label:'Exceptions',        value:EXCEPTIONS.length},
          {icon:'🚨',label:'High Severity',     value:highSeverity},
          {icon:'👥',label:'Employees in Run',  value:248},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      {/* 4-level state machine */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:14}}>🔐 Maker-Checker Approval Chain - June 2025</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
          {APPROVAL_LEVELS.map((l,i)=>{
            const sc = STATUS_CFG[l.status]
            return (
              <div key={l.level} style={{background:`${sc.c}10`,border:`1.5px solid ${sc.c}33`,borderRadius:12,padding:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:18}}>{sc.icon}</span>
                  <span style={{fontSize:9,color:sc.c,fontWeight:700}}>LEVEL {l.level}</span>
                </div>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{l.role}</div>
                <div style={{fontSize:9,color:'#64748b',marginTop:3}}>{l.name}</div>
                {l.action_at&&<div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{l.action_at}</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🤖</span>
        <div style={{flex:1,minWidth:200}}><strong>AI Anomaly Detection:</strong> Unusual pay spikes, new hires, terminations, and retroactive adjustments are auto-flagged before submission to Level 3. Per Nepal LA2074 Section 7/19, payroll must be internally verified for equal remuneration without discrimination before execution.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:10,marginTop:14,marginBottom:18}}>
        {filtered.map(e=>{
          return (
            <div key={e.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.employee,...e}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'14px 18px',display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
              <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,flexShrink:0}}>{e.severity}</span>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{e.employee} - {e.type}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{e.detail}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button style={{flex:1,minWidth:200,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>✅ Approve Payroll (Level 3)</button>
        <button style={{padding:'14px 24px',borderRadius:12,border:'1px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontSize:13,fontWeight:700,cursor:'pointer'}}>🚫 Reject</button>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔧',label:'Resolve',key:'resolve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

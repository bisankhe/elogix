// FILE: RewardsRecognitionProgramPage.jsx - Reward Program (Performance & Talent > Goal & Performance)
// Variable pay hub: spot bonuses, profit-sharing, points-to-redemption
// marketplace, budget-limited multi-tier approval matrix.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const REWARD_REQUESTS = [
  { id:'rw1', employee:'Gita Maharjan', type:'Spot Bonus', amount_npr:15000, reason:'Closed Acme deal 2 weeks early, exceptional client handling.',
    requested_by:'Priya Adhikari (Manager)', approval_tier:'Manager (Tier 1)', status:'approved', budget_used_pct:62,
    impact_links:['Bonus Processing','Performance Appraisal'] },
  { id:'rw2', employee:'Bikash Rai', type:'Profit-Sharing', amount_npr:8500, reason:'Q2 company profit distribution - pro-rated by tenure.',
    requested_by:'System (Automated)', approval_tier:'HR (Tier 2)', status:'pending', budget_used_pct:62,
    impact_links:[] },
  { id:'rw3', employee:'Anjali Sharma', type:'Spot Bonus', amount_npr:35000, reason:'Saved a NPR 2M renewal at risk of churning.',
    requested_by:'Dipesh Bhattarai (Director)', approval_tier:'Director (Tier 3)', status:'pending', budget_used_pct:62,
    flag_note:'Exceeds Tier 1/2 budget limit - requires Director sign-off per multi-tier matrix.',
    impact_links:['Bonus Processing'] },
]

const STATUS_CFG = {approved:{c:'#10b981',bg:'#f0fdf4',label:'Approved'},pending:{c:'#f59e0b',bg:'#fffbeb',label:'Pending Approval'},rejected:{c:'#ef4444',bg:'#fef2f2',label:'Rejected'}}

export default function RewardsRecognitionProgramPage() {
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = REWARD_REQUESTS.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const totalThisMonth = REWARD_REQUESTS.reduce((s,r)=>s+r.amount_npr,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎁" title="Reward Program"
        breadcrumb="Performance & Talent Management > Goal & Performance"
        gradient={G}
        stats={[
          {icon:'🎁',label:'Requests This Month', value:REWARD_REQUESTS.length},
          {icon:'💰',label:'Total Awarded',         value:'NPR '+totalThisMonth.toLocaleString()},
          {icon:'⏳',label:'Pending Approval',      value:REWARD_REQUESTS.filter(r=>r.status==='pending').length},
          {icon:'📊',label:'Budget Used',            value:'62%'},
        ]}
        onAdd={()=>setShowWizard(true)} addLabel="Nominate Reward"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Bylaws-Backed Transparency:</strong> Per Nepal Labour Act Sections 34/35, reward programs must be documented in the company's approved Internal Work Procedure to avoid discrimination claims. Spot bonuses route through a multi-tier approval matrix based on amount - larger awards need higher sign-off.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    <span style={{background:`${A}15`,color:A,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{r.type}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>Requested by {r.requested_by} . {r.approval_tier}</div>
                </div>
                <div style={{fontSize:16,fontWeight:900,color:A}}>NPR {r.amount_npr.toLocaleString()}</div>
              </div>
              <div style={{padding:'10px 18px',fontSize:10,color:'#374151'}}>{r.reason}</div>
              {r.flag_note&&<div style={{padding:'10px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}><strong>⚠</strong> {r.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {showWizard&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowWizard(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(560px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Nominate Reward</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Employee" type="select" value="" onChange={()=>{}} accent={A} options={['Gita Maharjan','Bikash Rai','Anjali Sharma']}/>
              <Field label="Reward Type" type="select" value="" onChange={()=>{}} accent={A} options={['Spot Bonus','Profit-Sharing']}/>
              <Field label="Amount (NPR)" type="number" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Reason" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <AIImpact color={A} lines={['Amount auto-routes to the correct approval tier based on the budget matrix.','Approved rewards sync directly into the next Bonus Processing payroll run.','Notification sent to the employee and their reporting manager once approved.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowWizard(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Nomination</button>
                <button onClick={()=>setShowWizard(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'✅',label:'Approve',key:'approve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Reward Program" columns={['Employee','Type','Amount NPR','Reason','Approval Tier','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

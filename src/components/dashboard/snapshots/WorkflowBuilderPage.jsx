// FILE: WorkflowBuilderPage.jsx - Workflow Builder
// (System Administration > Workflow & Automation)
// The visual Trigger -> Condition -> Action canvas -- the configurable
// META-LAYER sitting above the dozens of hard-coded triggers already
// written across this entire build (grievance escalation, claim
// stalling, license expiry, access routing, etc). Never replaces any
// of those triggers directly; this is where an admin could eventually
// define the NEXT one without an engineering ticket.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const NODE_CFG = { trigger:{c:'#0284c7',icon:'⚡'},condition:{c:'#f59e0b',icon:'🔀'},action:{c:'#15803d',icon:'✅'} }

const WORKFLOWS = [
  {name:'Leave Request Auto-Route',nodes:[
    {type:'trigger',label:'Employee submits leave'},
    {type:'condition',label:'Duration > 3 days'},
    {type:'action',label:'Route to Department Head + HR'},
  ],status:'active',runs_30d:142},
  {name:'New Hire Asset Provisioning',nodes:[
    {type:'trigger',label:'Onboarding status = Day 1'},
    {type:'condition',label:'Role requires laptop'},
    {type:'action',label:'Notify IT + Facilities'},
  ],status:'active',runs_30d:8},
  {name:'Visa Delay Exception (draft)',nodes:[
    {type:'trigger',label:'Work permit status = pending'},
    {type:'condition',label:'Start date < 14 days away'},
  ],status:'draft',runs_30d:0,
   flag_note:'Edge case workflow -- visa delays don\'t fit the standard onboarding path, built here instead of bypassing the system.'},
]

export default function WorkflowBuilderPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = WORKFLOWS.filter(w=>!search||w.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧩" title="Workflow Builder"
        breadcrumb="System Administration > Workflow & Automation"
        gradient={G}
        stats={[
          {icon:'🧩',label:'Active Workflows',  value:WORKFLOWS.filter(w=>w.status==='active').length},
          {icon:'📝',label:'Drafts',                value:WORKFLOWS.filter(w=>w.status==='draft').length},
          {icon:'▶',label:'Runs (30 days)',             value:WORKFLOWS.reduce((s,w)=>s+w.runs_30d,0)},
          {icon:'🔧',label:'No Code Required',                 value:'Always'},
        ]}
        onAdd={()=>{}} addLabel="New Workflow"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔧</span>
        <div style={{flex:1,minWidth:200}}><strong>Trigger, Condition, Action -- See the Whole Lifecycle:</strong> Build the path a request follows from start to finish visually -- no engineering ticket required when business needs shift, and edge cases get their own workflow instead of forcing a bypass.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search workflows..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map((w,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:w.name,...w,impact_links:['Approval Matrix / Workflow Setup']}})}}
            style={{background:'#fff',border:`1px solid ${w.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{w.name}</div>
              <span style={{background:w.status==='active'?'#f0fdf4':'#f8fafc',color:w.status==='active'?'#15803d':'#94a3b8',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
                {w.status==='active'?'✓ Active':'📝 Draft'}
              </span>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              {w.nodes.map((n,j)=>{
                const nc = NODE_CFG[n.type]
                return (
                  <div key={j} style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{background:`${nc.c}10`,border:`1px solid ${nc.c}33`,borderRadius:10,padding:'8px 12px',fontSize:9,color:nc.c,fontWeight:600}}>
                      {nc.icon} {n.label}
                    </div>
                    {j<w.nodes.length-1&&<span style={{color:'#cbd5e1'}}>→</span>}
                  </div>
                )
              })}
            </div>
            {w.flag_note&&<div style={{marginTop:10,fontSize:9,color:'#b45309'}}>⚠ {w.flag_note}</div>}
            {w.runs_30d>0&&<div style={{marginTop:8,fontSize:8,color:'#94a3b8'}}>{w.runs_30d} runs in the last 30 days</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI predicts where a new workflow might bottleneck before it goes live, based on patterns from similar existing chains.','Every node here can route to Approval Matrix, Notification Engine, or Escalation Rules -- the building blocks compose, never duplicate.','Drag a node anywhere on the canvas -- the underlying logic updates instantly, no deployment window required.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Open in Canvas',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )

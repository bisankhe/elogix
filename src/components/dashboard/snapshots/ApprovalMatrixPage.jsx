// FILE: ApprovalMatrixPage.jsx - Approval Matrix / Workflow Setup
// (System Administration > Workflow & Automation)
// The single, unified threshold-based routing table powering every
// module's approval chain -- distinct from ApprovalCenterPage (MSS,
// the manager's action queue) and ApprovalWorkflowPage (Finance &
// Claims, the claims-specific chain visualization). This is the
// CONFIGURATION layer those pages' routing logic should ultimately
// read from, addressing the brief's explicit "matrix maintenance
// drift as personnel change" pain point with a stale-reference check.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const MATRIX_RULES = [
  {process:'Leave Request',threshold:'> 3 days',chain:['Department Head','HR Manager']},
  {process:'Expense Claim',threshold:'NPR 0 - 10,000',chain:['Line Manager']},
  {process:'Expense Claim',threshold:'NPR 10,001+',chain:['Line Manager','Project Head','Finance']},
  {process:'IT Equipment Provisioning',threshold:'Any',chain:['IT Lead','Department Head'],
   approver_unresolved:true,flag_note:'Listed approver "IT Lead" no longer maps to an active employee -- requests here would route nowhere until reassigned.'},
]

export default function ApprovalMatrixPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = MATRIX_RULES.filter(r=>!search||r.process.toLowerCase().includes(search.toLowerCase()))
  const staleCount = MATRIX_RULES.filter(r=>r.approver_unresolved).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📐" title="Approval Matrix / Workflow Setup"
        breadcrumb="System Administration > Workflow & Automation"
        gradient={G}
        stats={[
          {icon:'📐',label:'Matrix Rules',  value:MATRIX_RULES.length},
          {icon:'⚠',label:'Stale Approver Refs',value:staleCount},
          {icon:'🧩',label:'Modules Powered',       value:'12+'},
          {icon:'🔁',label:'Single Source of Truth',    value:'Yes'},
        ]}
        onAdd={()=>{}} addLabel="New Matrix Rule"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔁</span>
        <div style={{flex:1,minWidth:200}}><strong>One Matrix, Not One Per Module:</strong> Leave, expense, and equipment approvals all route through this same table -- never a custom, siloed chain hidden inside one feature that the rest of the system can't see or maintain.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by process..."/>

      <div style={{overflowX:'auto',marginTop:14}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:10,minWidth:600}}>
          <thead><tr style={{background:'#f8fafc'}}>
            {['Process','Threshold','Approval Chain'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((r,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #f8fafc',background:r.flag_note?'#fff7ed':'transparent'}}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.process,...r,impact_links:['Multi-Level Approval']}})}}>
                <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{r.process}</td>
                <td style={{padding:'10px 12px',color:'#64748b'}}>{r.threshold}</td>
                <td style={{padding:'10px 12px'}}>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {r.chain.map((c,j)=><span key={j} style={{background:'#faf5ff',color:'#7c3aed',fontSize:8,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{c}</span>)}
                  </div>
                  {r.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {r.flag_note}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI scans every approver reference against active employee records nightly -- a personnel change that breaks the matrix surfaces here before a request silently stalls.','Threshold tiers compose directly -- raise the NPR 10,000 line once here, every module reading this matrix updates immediately.','Every matrix change is logged with who edited it and when, the audit trail the brief\'s pain point explicitly asks for.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Rule',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

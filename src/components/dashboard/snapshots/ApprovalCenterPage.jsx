// FILE: ApprovalCenterPage.jsx - Approval Center
// (HR Services & Support > Manager Self Service)
// Unified queue spanning leave, attendance, cash advance, and
// resignation approvals -- pure read aggregation over EXISTING tables,
// never a duplicate approval engine. Split-pane: list + detail drawer.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const PENDING_APPROVALS = [
  { id:'a1', type:'Leave Request', employee:'Hari Thapa', detail:'Annual leave, July 5-7 (3 days)', submitted:'2025-06-24',
    context:{leave_balance:'14 days remaining',team_overlap:'No other team member off that week'}, impact_links:['Leave Request'] },
  { id:'a2', type:'Cash Advance', employee:'Bikash Rai', detail:'NPR 25,000 -- medical emergency', submitted:'2025-06-20',
    context:{within_cap:true,max_allowed:'NPR 30,000',repayment:'2 installments'}, impact_links:['Cash Advance'] },
  { id:'a3', type:'Resignation', employee:'Sushila Gurung', detail:'Last working day: 2025-07-15', submitted:'2025-06-15',
    context:{acknowledgment_deadline:'2025-06-30 (6 days remaining)',reason:'Pursuing an opportunity abroad'}, impact_links:['My Resignation'] },
]

const TYPE_COLORS = { 'Leave Request':'#0284c7','Cash Advance':'#15803d','Resignation':'#7c3aed' }

export default function ApprovalCenterPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(PENDING_APPROVALS[0])
  const [ctx, setCtx] = useState(null)

  const filtered = PENDING_APPROVALS.filter(a=>!search||a.employee.toLowerCase().includes(search.toLowerCase())||a.type.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="✅" title="Approval Center"
        breadcrumb="HR Services & Support > Manager Self Service"
        gradient={G}
        stats={[
          {icon:'⏳',label:'Pending Approvals',  value:PENDING_APPROVALS.length},
          {icon:'🏖',label:'Leave Requests',        value:PENDING_APPROVALS.filter(a=>a.type==='Leave Request').length},
          {icon:'💵',label:'Cash Advances',            value:PENDING_APPROVALS.filter(a=>a.type==='Cash Advance').length},
          {icon:'🚪',label:'Resignations',                value:PENDING_APPROVALS.filter(a=>a.type==='Resignation').length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📋</span>
        <div style={{flex:1,minWidth:200}}><strong>One Queue, Full Context:</strong> Every approval type lands here -- click any item to see the exact context you need (leave balance, budget cap, deadline) without leaving the page.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search approvals..."/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:16,marginTop:14}}>
        {/* List pane */}
        <div style={{display:'grid',gap:10}}>
          {filtered.map(a=>(
            <div key={a.id} onClick={()=>setSelected(a)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.employee,...a}})}}
              style={{background:selected?.id===a.id?'#fff7ed':'#fff',border:`1.5px solid ${selected?.id===a.id?A:'#e2e8f0'}`,borderRadius:12,padding:'12px 14px',cursor:'pointer'}}>
              <span style={{background:`${TYPE_COLORS[a.type]}15`,color:TYPE_COLORS[a.type],fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{a.type}</span>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginTop:6}}>{a.employee}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{a.detail}</div>
            </div>
          ))}
        </div>

        {/* Detail drawer */}
        {selected&&(
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',alignSelf:'start'}}>
            <span style={{background:`${TYPE_COLORS[selected.type]}15`,color:TYPE_COLORS[selected.type],fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{selected.type}</span>
            <div style={{fontSize:14,fontWeight:900,color:'#0f172a',marginTop:10}}>{selected.employee}</div>
            <div style={{fontSize:10,color:'#374151',marginTop:4}}>{selected.detail}</div>
            <div style={{marginTop:14,background:'#f8fafc',borderRadius:10,padding:'12px 14px'}}>
              {Object.entries(selected.context).map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:9,padding:'4px 0'}}>
                  <span style={{color:'#94a3b8',textTransform:'capitalize'}}>{k.replace(/_/g,' ')}</span><span style={{fontWeight:700,color:'#0f172a'}}>{String(v)}</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button style={{flex:1,padding:11,borderRadius:10,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>
              <button style={{flex:1,padding:11,borderRadius:10,border:'1px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontSize:11,fontWeight:700,cursor:'pointer'}}>❌ Reject</button>
              <button style={{padding:'11px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:10,cursor:'pointer'}}>↪ Forward</button>
            </div>
          </div>
        )}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Context like budget caps and statutory deadlines pulls live -- never a number you have to verify separately.','Requests sitting unactioned for 48+ hours auto-escalate with a reminder.','Forwarding a request (e.g. cash advance exceeding your limit) logs a mandatory justification and an audit-stamped trail.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}

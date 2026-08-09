// FILE: KnowledgeTransferPage.jsx - Knowledge Transfer (Exit Management)
// Manager-assigned KT checklist, SOP repository, task reassignment, peer overlap tracking

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const KT_PLANS = [
  { id:'kt1', employee:'Dipendra Yadav', position:'Junior Accountant', lwd:'2025-07-10',
    successor:'New Hire (TBD)', overlap_days:0,
    checklist:[
      {item:'SOP: Monthly Reconciliation Process',uploaded:true,reassigned:true},
      {item:'Vendor Contact List & Payment Schedules',uploaded:true,reassigned:true},
      {item:'Pending Tasks Handover',uploaded:true,reassigned:true},
      {item:'Shared Drive Access Documentation',uploaded:false,reassigned:false},
    ],
    sop_count:3, tasks_reassigned:5, tasks_total:5, manager_signoff:true,
    impact_links:['Exit Interview','Employee Timeline'] },
  { id:'kt2', employee:'Anjali Sharma', position:'Sales Executive', lwd:'2025-06-22',
    successor:'Sushant Lama (Peer)', overlap_days:3,
    checklist:[
      {item:'Active Client Pipeline Handover',uploaded:false,reassigned:false},
      {item:'CRM Access & Deal Notes',uploaded:false,reassigned:false},
      {item:'Pending Tasks Handover',uploaded:false,reassigned:false},
    ],
    sop_count:0, tasks_reassigned:0, tasks_total:8, manager_signoff:false,
    impact_links:[] },
]

export default function KnowledgeTransferPage() {
  const [plans, setPlans] = useState(KT_PLANS)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = plans.filter(p=>!search||p.employee.toLowerCase().includes(search.toLowerCase()))
  const totalSops = plans.reduce((s,p)=>s+p.sop_count,0)
  const signoffCount = plans.filter(p=>p.manager_signoff).length

  const toggleChecklistItem = (planId, idx, field) => {
    setPlans(prev=>prev.map(p=>{
      if (p.id!==planId) return p
      const checklist = p.checklist.map((c,i)=>i===idx?{...c,[field]:!c[field]}:c)
      return {...p, checklist}
    }))
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🧠" title="Knowledge Transfer"
        breadcrumb="Employee Lifecycle > Offboarding > Exit Management"
        gradient={G}
        stats={[
          {icon:'🧠',label:'Active KT Plans', value:plans.length},
          {icon:'📄',label:'SOPs Captured',    value:totalSops},
          {icon:'✅',label:'Manager Signed Off',value:signoffCount},
          {icon:'⏰',label:'Avg Overlap Days', value:Math.round(plans.reduce((s,p)=>s+p.overlap_days,0)/plans.length)},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Create KT Plan"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>💡</span>
        <div><strong>Dedicated Overlap, Not File Dumps:</strong> Best practice requires the departing employee spend their last 1-2 weeks actively training a peer/successor - not just uploading files. Nepal's 30-day notice period for tenured staff serves as the legally recognized handover window.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(p=>{
          const doneCount = p.checklist.filter(c=>c.uploaded&&c.reassigned).length
          const pct = Math.round(doneCount/p.checklist.length*100)
          return (
            <div key={p.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.employee,...p}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${pct===100?'#10b981':'#f59e0b'}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{p.employee}</span>
                    <span style={{background:p.manager_signoff?'#f0fdf4':'#fffbeb',color:p.manager_signoff?'#15803d':'#b45309',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>
                      {p.manager_signoff?'✅ Manager Signed Off':'⏳ Awaiting Sign-off'}
                    </span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{p.position} . LWD: {p.lwd}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Successor: <strong>{p.successor}</strong> {p.overlap_days>0?`. ${p.overlap_days} days overlap`:'. No overlap scheduled'}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:pct===100?'#10b981':A}}>{p.tasks_reassigned}/{p.tasks_total}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>TASKS REASSIGNED</div>
                </div>
              </div>

              <div style={{padding:'12px 20px',borderBottom:'1px solid #f8fafc'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:10}}>
                  <span style={{color:'#64748b'}}>KT Checklist Progress</span>
                  <span style={{fontWeight:700,color:pct===100?'#10b981':A}}>{pct}%</span>
                </div>
                <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden',marginBottom:10}}>
                  <div style={{width:`${pct}%`,height:'100%',background:pct===100?'#10b981':A,borderRadius:7,transition:'width .5s'}}/>
                </div>
                {p.checklist.map((c,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:i<p.checklist.length-1?'1px solid #f8fafc':'none'}}>
                    <span style={{fontSize:11,color:'#374151'}}>{c.item}</span>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>toggleChecklistItem(p.id,i,'uploaded')}
                        style={{padding:'3px 10px',borderRadius:6,border:'none',background:c.uploaded?'#f0fdf4':'#f8fafc',color:c.uploaded?'#10b981':'#94a3b8',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                        {c.uploaded?'✓ Doc Uploaded':'Upload Doc'}
                      </button>
                      <button onClick={()=>toggleChecklistItem(p.id,i,'reassigned')}
                        style={{padding:'3px 10px',borderRadius:6,border:'none',background:c.reassigned?'#f0fdf4':'#f8fafc',color:c.reassigned?'#10b981':'#94a3b8',fontSize:9,fontWeight:700,cursor:'pointer'}}>
                        {c.reassigned?'✓ Reassigned':'Reassign'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {!p.manager_signoff&&(
                <div style={{padding:'10px 20px',display:'flex',justifyContent:'flex-end'}}>
                  <button style={{padding:'7px 16px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Manager Sign-off</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:620,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Create Knowledge Transfer Plan</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Departing Employee" type="select" value="" onChange={()=>{}} accent={A} options={['Anjali Sharma']}/>
                <Field label="Successor / Peer" value="" onChange={()=>{}} accent={A} hint="Name or 'TBD' if not yet hired"/>
                <Field label="Overlap Period (days)" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Manager" value="" onChange={()=>{}} accent={A}/>
              </div>
              <Field label="Key Handover Items (one per line)" type="textarea" value="" onChange={()=>{}} accent={A} hint="Voice input - e.g. SOPs, client lists, passwords, pending tasks"/>
              <AIImpact color={A} lines={['AI suggests checklist items based on role and department.','Manager prompted to reassign each subordinate/task individually.','SOP documents auto-archived to searchable Document Management Module.','Sign-off required before final exit clearance can complete.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create KT Plan</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Plan',key:'view'},{icon:'📄',label:'View SOP Documents',key:'sop'},
        {icon:'✅',label:'Manager Sign-off',key:'signoff'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Knowledge Transfer" columns={['Employee','Position','LWD','Successor','Overlap Days','Tasks Reassigned','SOPs Captured','Manager Signoff']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

// FILE: RecruitmentAnalyticsPage.jsx - Recruitment Analytics
// Time-to-hire, cost-per-hire, source analytics, pipeline velocity
import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#3b82f6 100%)'
const A = '#1e40af'

// ── Mock data specific to Recruitment Analytics ─────────────────────
const MOCK_DATA = [
  {id:'d1', name:'Rajan Shrestha',    position:'Senior SW Dev',   dept:'IT',      status:'active',  score:94, date:'2025-06-18', stage:'Recruitment Analytics Step 1', priority:'high',   notes:'Top candidate. AI rank 1.'},
  {id:'d2', name:'Gita Maharjan',     position:'Cloud Architect', dept:'IT',      status:'active',  score:97, date:'2025-06-20', stage:'Recruitment Analytics Step 2', priority:'critical',notes:'Perfect match. Fast-track.'},
  {id:'d3', name:'Maya Pradhan',      position:'Finance Manager', dept:'Finance', status:'pending', score:88, date:'2025-06-17', stage:'Recruitment Analytics Step 1', priority:'high',   notes:'CA qualified. Panel review.'},
  {id:'d4', name:'Sita Khadka',       position:'HR BP',           dept:'HR',      status:'pending', score:83, date:'2025-06-19', stage:'Recruitment Analytics Step 1', priority:'medium', notes:'Good fit. Needs confirmation.'},
]

const STATUS_CFG = {
  active:   {c:'#10b981', bg:'#f0fdf4', b:'#bbf7d0', icon:'✅', label:'Active'},
  pending:  {c:'#f59e0b', bg:'#fffbeb', b:'#fde68a', icon:'⏳', label:'Pending'},
  completed:{c:'#64748b', bg:'#f8fafc', b:'#e2e8f0', icon:'✓',  label:'Completed'},
  rejected: {c:'#ef4444', bg:'#fef2f2', b:'#fecaca', icon:'❌', label:'Rejected'},

const CTX_ACTIONS = [
  {icon:'👁', label:'View Details',     key:'view'},
  {icon:'✅', label:'Approve',          key:'approve'},
  {icon:'📧', label:'Send Notification',key:'notify'},
  {icon:'🔗', label:'Impact Analysis',  key:'impact'},
  {icon:'📤', label:'Export',           key:'export'},
  {icon:'❌', label:'Reject',           key:'reject', danger:true},
]

const IMPACT_LINKS = ['ATS Dashboard','Vacancy Management','Candidate Database','HR Dashboard','Annual Manpower Plan']

export default function RecruitmentAnalyticsPage() {
  const [items, setItems]         = useState(MOCK_DATA)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [selected, setSelected]   = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)

  const filtered = items.filter(i=>{
    if (filterStatus!=='all'&&i.status!==filterStatus) return false
    if (search&&!i.name.toLowerCase().includes(search.toLowerCase())&&!i.position.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCount  = items.filter(i=>i.status==='active').length
  const pendingCount = items.filter(i=>i.status==='pending').length
  const avgScore     = Math.round(items.reduce((s,i)=>s+i.score,0)/items.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Recruitment Analytics"
        breadcrumb="Employee Lifecycle > Recruitment > Recruitment Management"
        gradient={G}
        stats={[
          {icon:'📊',label:'Total Records',  value:items.length},
          {icon:'✅',label:'Active',              value:activeCount},
          {icon:'⏳',label:'Pending',             value:pendingCount},
          {icon:'🤖',label:'Avg AI Score',        value:avgScore+'%'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Record"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:`${A}08`,border:`1px solid ${A}22`,borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:A,display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🤖</span>
        <div><strong>AI-Driven Recruitment Analytics:</strong> System automatically processes and routes all records. Nepal Labour Act 2074 compliance enforced. Voice input supported on all forms.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search records..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','active','pending','completed','rejected'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14}}>
        {filtered.map(item=>{
          const sc = STATUS_CFG[item.status]||STATUS_CFG.pending
          return (
            <LuxCard key={item.id} color={A} onClick={()=>setSelected(item)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:item.name,...item}})}}>
              <div style={{padding:'14px 16px 10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:2}}>{item.name}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{item.position} . {item.dept} . {item.date}</div>
                    <div style={{marginTop:4,display:'flex',gap:5}}>
                      <span style={{background:sc.bg,color:sc.c,border:`1px solid ${sc.b}`,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                      <span style={{background:'#fef9c3',color:'#854d0e',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,textTransform:'uppercase'}}>{item.priority}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:22,fontWeight:900,color:item.score>=90?'#10b981':item.score>=75?A:'#f59e0b'}}>{item.score}%</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>AI SCORE</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:'#475569',padding:'8px 10px',background:'#f8fafc',borderRadius:8,marginTop:4}}>
                  <strong>Stage:</strong> {item.stage}
                </div>
                <div style={{fontSize:10,color:'#64748b',fontStyle:'italic',marginTop:6}}>🤖 {item.notes}</div>
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                <button onClick={ev=>{ev.stopPropagation();setItems(p=>p.map(i=>i.id===item.id?{...i,status:'active'}:i))}} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>Approve</button>
                <button onClick={ev=>{ev.stopPropagation();alert('Notification sent!')}} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:'#fffbeb',color:'#b45309',fontSize:10,fontWeight:700,cursor:'pointer'}}>Notify</button>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Recruitment Analytics Record</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Candidate" type="select" value="" onChange={()=>{}} accent={A} options={['Rajan Shrestha','Gita Maharjan','Maya Pradhan','Sita Khadka']}/>
                <Field label="Position" value="" onChange={()=>{}} accent={A}/>
                <Field label="Date" type="date" value="" onChange={()=>{}} accent={A}/>
                <Field label="Priority" type="select" value="" onChange={()=>{}} accent={A} options={['critical','high','medium','low']}/>
                <Field label="Notes" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              </div>
              <AIImpact color={A} lines={['AI processes and auto-routes this record.','Nepal LA2074 compliance auto-checked.','Auto-notifications sent on submission.','Links to ATS, Vacancy Management, and HR Dashboard.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{setItems(p=>[{id:'d'+Date.now(),name:'New Entry',position:'Position',dept:'TBD',status:'pending',score:0,date:new Date().toISOString().split('T')[0],stage:'Initiated',priority:'medium',notes:'Newly added'},...p]);setShowAdd(false)}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={IMPACT_LINKS} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Recruitment Analytics" columns={['Name','Position','Department','Status','AI Score','Date','Stage','Priority','Notes']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Name',selected?.name],['Position',selected?.position],['Department',selected?.dept],
        ['Status',selected?.status],['AI Score',selected?.score+'%'],['Date',selected?.date],
        ['Stage',selected?.stage],['Priority',selected?.priority],['Notes',selected?.notes],
      ]}/>
    </div>
  )

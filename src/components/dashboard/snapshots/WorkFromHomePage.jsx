// FILE: WorkFromHomePage.jsx — Work From Home Management
import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0f172a 0%,#1e40af 60%,#93c5fd 100%)'
const A = '#1e40af'

const WFH_DATA = [
  { id:'w1', emp:'Gita Maharjan', emp_id:'EMP-0142', dept:'IT', position:'Cloud Architect', date:'2025-07-21', type:'approved', reason:'Cloud infrastructure setup requires dedicated home environment', task_plan:'Deploy k8s cluster, configure CI/CD, write documentation', checkin:'09:02', checkout:'17:45', tasks_completed:3, tasks_planned:3, manager:'Rajesh Sharma', status:'completed' },
  { id:'w2', emp:'Sunita Rai', emp_id:'EMP-0141', dept:'IT', position:'Developer', date:'2025-07-22', type:'pending', reason:'Child sick — need to stay home to care for child', task_plan:'Code review, bug fixes, sprint planning', checkin:null, checkout:null, tasks_completed:0, tasks_planned:3, manager:'Rajesh Sharma', status:'pending_approval' },
  { id:'w3', emp:'Priya Khadka', emp_id:'EMP-0089', dept:'CS', position:'CS Officer', date:'2025-07-21', type:'approved', reason:'Client calls can be handled remotely', task_plan:'Handle 20 client calls, update CRM, prepare weekly report', checkin:'08:55', checkout:'17:30', tasks_completed:2, tasks_planned:3, manager:'Anil Bista', status:'active' },
]

const STATUS = { completed:{c:'#10b981',icon:'✅'}, active:{c:'#3b82f6',icon:'🟢'}, pending_approval:{c:'#f59e0b',icon:'⏳'}, rejected:{c:'#ef4444',icon:'❌'} }

export default function WorkFromHomePage() {
  const [wfh, setWfh]       = useState(WFH_DATA)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]     = useState({emp:'',emp_id:'',dept:'IT',position:'',date:'',reason:'',taskPlan:''})
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]       = useState(null)
  const [msg, setMsg]       = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = wfh.filter(w=>!search||w.emp.toLowerCase().includes(search.toLowerCase()))
  const approveWfh = (id, action) => {
    setWfh(prev=>prev.map(w=>w.id!==id?w:{...w,status:action==='approve'?'active':'rejected',type:action==='approve'?'approved':'rejected'}))
    notify(action==='approve'?'✅ WFH approved — employee notified':'❌ WFH request rejected')
  }

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🏠" title="Work From Home"
        breadcrumb="Workforce Operations > Attendance > Work From Home"
        gradient={G}
        stats={[
          {icon:'🏠',label:'WFH Today',          value:wfh.filter(w=>w.status!=='rejected').length},
          {icon:'✅',label:'Completed',            value:wfh.filter(w=>w.status==='completed').length},
          {icon:'⏳',label:'Pending Approval',    value:wfh.filter(w=>w.status==='pending_approval').length},
          {icon:'📊',label:'Task Completion',     value:Math.round(wfh.filter(w=>w.tasks_planned>0).reduce((s,w)=>s+w.tasks_completed/w.tasks_planned,0)/Math.max(1,wfh.filter(w=>w.tasks_planned>0).length)*100)+'%'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Request WFH"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(w=>{
          const sc = STATUS[w.status]||STATUS.pending_approval
          const taskPct = w.tasks_planned>0?Math.round(w.tasks_completed/w.tasks_planned*100):0
          return (
            <div key={w.id} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:w.emp,...w}})}}
              style={{background:'#fff',border:`1px solid ${sc.c}30`,borderRadius:14,overflow:'hidden',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900}}>{w.emp}</span>
                    <span style={{fontSize:10,color:'#94a3b8'}}>{w.emp_id}</span>
                    <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.icon} {w.status.replace('_',' ')}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{w.position} · {w.dept} · {w.date} · Manager: {w.manager}</div>
                  <div style={{fontSize:10,color:'#475569',marginTop:3,fontStyle:'italic'}}>📝 {w.reason}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:taskPct===100?'#10b981':A}}>{taskPct}%</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>TASKS DONE</div>
                </div>
              </div>
              <div style={{padding:'10px 18px',fontSize:10,color:'#475569',borderBottom:'1px solid #f8fafc'}}>
                <strong>Task Plan:</strong> {w.taskPlan||w.task_plan}
              </div>
              {(w.checkin||w.status!=='pending_approval')&&(
                <div style={{padding:'8px 18px',display:'flex',gap:12,fontSize:10,color:'#64748b',flexWrap:'wrap'}}>
                  <span>🟢 Check-in: {w.checkin||'—'}</span>
                  <span>🔴 Check-out: {w.checkout||'—'}</span>
                  <span>✅ Tasks: {w.tasks_completed}/{w.tasks_planned}</span>
                </div>
              )}
              {w.status==='pending_approval'&&(
                <div style={{padding:'8px 14px',display:'flex',gap:6,justifyContent:'flex-end'}}>
                  <button onClick={()=>approveWfh(w.id,'approve')} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ Approve WFH</button>
                  <button onClick={()=>approveWfh(w.id,'reject')} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer'}}>❌ Reject</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:500,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:13,fontWeight:900}}>🏠 Request Work From Home</div>
            </div>
            <div style={{padding:'18px 22px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {[['Employee Name *','emp','text'],['Employee ID','emp_id','text'],['Position','position','text'],['Date *','date','date']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Department</label>
                  <select value={form.dept} onChange={e=>setForm(p=>({...p,dept:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                    {['IT','Finance','HR','Operations','Sales','Customer Service'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              {[['Reason for WFH *','reason'],['Task Plan for the Day *','taskPlan']].map(([l,f])=>(
                <div key={f} style={{marginBottom:12}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                  <textarea value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))} rows={2}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:10,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{if(!form.emp||!form.date){notify('⚠️ Name and date required');return}setWfh(p=>[...p,{id:'w'+Date.now(),...form,checkin:null,checkout:null,tasks_completed:0,tasks_planned:3,manager:'HR Manager',status:'pending_approval',type:'pending'}]);notify('✅ WFH request submitted — manager notified');setShowAdd(false);setForm({emp:'',emp_id:'',dept:'IT',position:'',date:'',reason:'',taskPlan:''})}}
                  style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>🏠 Submit WFH Request</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[{icon:'✅',label:'Approve WFH',key:'approve'},{icon:'❌',label:'Reject',key:'reject',danger:true}]} onAction={(k,item)=>approveWfh(item.id,k)} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Work From Home" columns={['Employee','Emp ID','Dept','Date','Status','Task Plan','Check-In','Check-Out','Tasks Done']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
    </div>
  )
}

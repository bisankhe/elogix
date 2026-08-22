// FILE: MissedPunchPage.jsx — Missed Punch Request
import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const REQUESTS = [
  { id:'mp1', emp:'Ramesh KC', emp_id:'EMP-0054', dept:'Finance', date:'2025-07-18', punch_type:'check_out', expected_time:'18:00', actual_entry:'', reason:'Forgot to check out — was in client meeting until 19:30', status:'pending', manager:'Sanjay Karki' },
  { id:'mp2', emp:'Maya Pradhan', emp_id:'EMP-0098', dept:'Finance', date:'2025-07-17', punch_type:'check_in', expected_time:'09:00', actual_entry:'09:05', reason:'Biometric device not reading finger — used manual register', status:'approved', manager:'Sanjay Karki', approved_date:'2025-07-18' },
  { id:'mp3', emp:'Sunita Rai', emp_id:'EMP-0141', dept:'IT', date:'2025-07-19', punch_type:'check_in', expected_time:'08:45', actual_entry:'', reason:'System was down during morning — no log recorded', status:'pending', manager:'Rajesh Sharma' },
]

const STATUS = { pending:{c:'#f59e0b',icon:'⏳'}, approved:{c:'#10b981',icon:'✅'}, rejected:{c:'#ef4444',icon:'❌'} }

export default function MissedPunchPage() {
  const [requests, setRequests] = useState(REQUESTS)
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState({emp:'',emp_id:'',date:'',punchType:'check_in',expectedTime:'',actualEntry:'',reason:''})
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]           = useState(null)
  const [msg, setMsg]           = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = requests.filter(r=>!search||r.emp.toLowerCase().includes(search.toLowerCase()))

  const approveReq = (id, action) => {
    setRequests(prev=>prev.map(r=>r.id!==id?r:{...r,status:action==='approve'?'approved':'rejected',approved_date:new Date().toISOString().split('T')[0]}))
    notify(action==='approve'?'✅ Missed punch approved — attendance updated':'❌ Missed punch request rejected')
  }

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🕐" title="Missed Punch Request"
        breadcrumb="Workforce Operations > Attendance > Missed Punch"
        gradient={G}
        stats={[
          {icon:'⏳',label:'Pending',  value:requests.filter(r=>r.status==='pending').length},
          {icon:'✅',label:'Approved', value:requests.filter(r=>r.status==='approved').length},
          {icon:'❌',label:'Rejected', value:requests.filter(r=>r.status==='rejected').length},
          {icon:'📋',label:'Total',    value:requests.length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Request Correction"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:10,marginTop:14}}>
        {filtered.map(r=>{
          const sc = STATUS[r.status]||STATUS.pending
          return (
            <div key={r.id} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.emp,...r}})}}
              style={{background:'#fff',border:`1px solid ${sc.c}30`,borderRadius:12,padding:'14px 18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:800}}>{r.emp} <span style={{fontSize:10,color:'#94a3b8'}}>{r.emp_id}</span></span>
                    <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {r.status}</span>
                    <span style={{background:'#eff6ff',color:A,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{r.punch_type.replace('_',' ').toUpperCase()}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{r.dept} · Date: {r.date} · Expected: {r.expectedTime}</div>
                  <div style={{fontSize:10,color:'#475569',marginTop:3,fontStyle:'italic'}}>📝 {r.reason}</div>
                </div>
                {r.status==='pending'&&(
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button onClick={()=>approveReq(r.id,'approve')} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#10b981',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>
                    <button onClick={()=>approveReq(r.id,'reject')} style={{padding:'5px 12px',borderRadius:7,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,cursor:'pointer'}}>❌ Reject</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:480,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'14px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:13,fontWeight:900}}>🕐 Request Punch Correction</div>
            </div>
            <div style={{padding:'18px 22px'}}>
              {[['Employee Name *','emp','text'],['Employee ID','emp_id','text'],['Date *','date','date'],['Expected Time','expectedTime','time'],['Actual Time (if known)','actualEntry','time']].map(([l,f,t])=>(
                <div key={f} style={{marginBottom:12}}>
                  <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                  <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
              <div style={{marginBottom:12}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Punch Type</label>
                <select value={form.punchType} onChange={e=>setForm(p=>({...p,punchType:e.target.value}))}
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                  {['check_in','check_out','break_start','break_end'].map(o=><option key={o} value={o}>{o.replace('_',' ').toUpperCase()}</option>)}
                </select>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Reason *</label>
                <textarea value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} rows={3}
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:10,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{if(!form.emp||!form.date){notify('⚠️ Name and date required');return}setRequests(p=>[...p,{id:'mp'+Date.now(),...form,punchType:form.punchType,expectedTime:form.expectedTime,actual_entry:form.actualEntry,status:'pending',manager:'HR Manager'}]);notify('✅ Punch correction request submitted');setShowAdd(false);setForm({emp:'',emp_id:'',date:'',punchType:'check_in',expectedTime:'',actualEntry:'',reason:''})}}
                  style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>Submit Request</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[{icon:'✅',label:'Approve',key:'approve'},{icon:'❌',label:'Reject',key:'reject',danger:true}]} onAction={(k,item)=>approveReq(item.id,k)} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Missed Punch" columns={['Employee','Emp ID','Date','Punch Type','Expected','Actual','Reason','Status']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
    </div>
  )
}

// FILE: WebCheckinPage.jsx — Web Check-In & Out
import { useState } from 'react'
import { PageHeader, SearchBar, ExcelModal, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#134e4a 0%,#0f766e 60%,#5eead4 100%)'
const A = '#0f766e'

const LOGS = [
  { id:'w1', emp:'Gita Maharjan', emp_id:'EMP-0142', dept:'IT', date:'2025-07-21', check_in:'08:57', check_out:'17:42', work_hrs:'8h 45m', ip:'192.168.1.45', device:'Chrome/Win11', location:'KTM HQ', status:'on_time' },
  { id:'w2', emp:'Ramesh KC',     emp_id:'EMP-0054', dept:'Finance', date:'2025-07-21', check_in:'09:18', check_out:'17:30', work_hrs:'8h 12m', ip:'192.168.1.62', device:'Firefox/Win10', location:'KTM HQ', status:'late' },
  { id:'w3', emp:'Sunita Rai',    emp_id:'EMP-0141', dept:'IT', date:'2025-07-21', check_in:'08:45', check_out:'17:45', work_hrs:'9h 00m', ip:'192.168.1.78', device:'Chrome/Mac', location:'KTM HQ', status:'on_time' },
  { id:'w4', emp:'Maya Pradhan',  emp_id:'EMP-0098', dept:'Finance', date:'2025-07-21', check_in:'08:52', check_out:null, work_hrs:'—', ip:'192.168.1.55', device:'Safari/iPhone', location:'Remote/WFH', status:'active' },
]

const STATUS = { on_time:{c:'#10b981',icon:'✅'}, late:{c:'#f59e0b',icon:'⚠️'}, active:{c:'#3b82f6',icon:'🟢'}, absent:{c:'#ef4444',icon:'❌'} }

export default function WebCheckinPage() {
  const [logs, setLogs]     = useState(LOGS)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]     = useState({emp:'',emp_id:'',reason:''})
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]       = useState(null)
  const [msg, setMsg]       = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = logs.filter(l=>!search||l.emp.toLowerCase().includes(search.toLowerCase()))
  const now = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="💻" title="Web Check-In & Out"
        breadcrumb="Workforce Operations > Attendance > Web Check-In"
        gradient={G}
        stats={[
          {icon:'✅',label:'Checked In Today',  value:logs.filter(l=>l.check_in).length},
          {icon:'🟢',label:'Still Active',       value:logs.filter(l=>l.status==='active').length},
          {icon:'⚠️',label:'Late Today',         value:logs.filter(l=>l.status==='late').length},
          {icon:'⏰',label:'Current Time',       value:now},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Manual Entry"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{msg}</div>}

      {/* Live check-in widget */}
      <div style={{background:G,borderRadius:14,padding:'20px 24px',marginBottom:16,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:900,color:'#fff',marginBottom:4}}>Your Web Check-In</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.8)'}}>IP: 192.168.1.45 · Browser: Chrome · Location: KTM HQ</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>notify('✅ Check-In recorded: '+new Date().toLocaleTimeString())} style={{padding:'12px 24px',borderRadius:12,border:'none',background:'rgba(255,255,255,.95)',color:A,fontSize:12,fontWeight:800,cursor:'pointer'}}>🟢 Check In</button>
          <button onClick={()=>notify('🔴 Check-Out recorded: '+new Date().toLocaleTimeString())} style={{padding:'12px 24px',borderRadius:12,border:'2px solid rgba(255,255,255,.5)',background:'transparent',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>🔴 Check Out</button>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden',marginTop:14}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
            {['Employee','Date','Check-In','Check-Out','Hours','IP / Device','Location','Status','Actions'].map(h=>(
              <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:700,color:A}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((l,i)=>{
              const sc = STATUS[l.status]||STATUS.absent
              return (
                <tr key={l.id} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.emp,...l}})}}
                  style={{borderBottom:'1px solid #f1f5f9',background:i%2?'#fafafa':'#fff'}}>
                  <td style={{padding:'9px 12px',fontWeight:700}}>{l.emp}<div style={{fontSize:8,color:'#94a3b8'}}>{l.emp_id} · {l.dept}</div></td>
                  <td style={{padding:'9px 12px'}}>{l.date}</td>
                  <td style={{padding:'9px 12px',color:'#10b981',fontWeight:700}}>{l.check_in}</td>
                  <td style={{padding:'9px 12px',color:l.check_out?'#ef4444':'#3b82f6',fontWeight:700}}>{l.check_out||'—'}</td>
                  <td style={{padding:'9px 12px'}}>{l.work_hrs}</td>
                  <td style={{padding:'9px 12px',fontSize:9,color:'#64748b'}}>{l.ip}<div>{l.device}</div></td>
                  <td style={{padding:'9px 12px'}}>{l.location}</td>
                  <td style={{padding:'9px 12px'}}><span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {l.status.replace('_',' ')}</span></td>
                  <td style={{padding:'9px 12px'}}><button onClick={()=>notify('📋 Details loaded for '+l.emp)} style={{padding:'4px 10px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer'}}>View</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:24,width:400,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:14}}>+ Manual Attendance Entry</div>
            {[['Employee Name *','emp','text'],['Employee ID','emp_id','text'],['Reason for Manual Entry','reason','text']].map(([l,f,t])=>(
              <div key={f} style={{marginBottom:12}}>
                <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
              </div>
            ))}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{notify('✅ Manual entry recorded for '+form.emp);setShowAdd(false);setForm({emp:'',emp_id:'',reason:''})}} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>Save Entry</button>
              <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[{icon:'👁',label:'View Details',key:'view'},{icon:'✏️',label:'Edit',key:'edit'},{icon:'📤',label:'Export',key:'export'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Web Check-In" columns={['Employee','Emp ID','Dept','Date','Check-In','Check-Out','Hours','IP','Device','Location','Status']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
    </div>
  )

// FILE: BackgroundVerificationPage.jsx — Background Verification
// Multi-check BGV: Education, Employment, Criminal, Reference checks
import { useState } from 'react'
import { ExcelModal, PageHeader, SearchBar, ContextMenu, Drawer } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#065f46 0%,#047857 60%,#34d399 100%)'
const A = '#047857'

const CHECK_TYPES = ['Education','Previous Employment','Criminal Record','Reference Check','Address Verification','Credit Check']

const BGV_RECORDS = [
  { id:'b1', candidate:'Gita Maharjan', position:'Cloud Architect', dept:'IT', status:'clear',
    initiated_date:'2025-06-20', completed_date:'2025-06-25', agency:'VerifyNepal Pvt. Ltd.',
    checks:{Education:'clear',Previous_Employment:'clear',Criminal_Record:'clear',Reference_Check:'clear',Address_Verification:'clear',Credit_Check:'clear'},
    notes:'All checks clear. Candidate verified.', impact_links:['Offer Management','ATS Dashboard'] },
  { id:'b2', candidate:'Rajan Shrestha', position:'Senior SW Dev', dept:'IT', status:'in_progress',
    initiated_date:'2025-06-22', completed_date:null, agency:'TrustCheck Nepal',
    checks:{Education:'clear',Previous_Employment:'in_progress',Criminal_Record:'clear',Reference_Check:'pending',Address_Verification:'clear',Credit_Check:'pending'},
    notes:'Education and criminal record clear. Employment verification in progress.', impact_links:['Offer Management'] },
  { id:'b3', candidate:'Maya Pradhan', position:'Finance Manager', dept:'Finance', status:'flag',
    initiated_date:'2025-06-18', completed_date:'2025-06-24', agency:'VerifyNepal Pvt. Ltd.',
    checks:{Education:'clear',Previous_Employment:'flag',Criminal_Record:'clear',Reference_Check:'clear',Address_Verification:'clear',Credit_Check:'clear'},
    notes:'⚠️ Employment gap of 8 months (2021-22) unaccounted. Requires candidate clarification.', impact_links:['Offer Management','HR Dashboard'] },
]

const STATUS_CFG = {
  clear:       {c:'#10b981',bg:'#f0fdf4',b:'#bbf7d0',icon:'✅',label:'All Clear'},
  in_progress: {c:'#3b82f6',bg:'#eff6ff',b:'#bfdbfe',icon:'🔄',label:'In Progress'},
  flag:        {c:'#f59e0b',bg:'#fffbeb',b:'#fde68a',icon:'⚠️',label:'Flag Raised'},
  failed:      {c:'#ef4444',bg:'#fef2f2',b:'#fecaca',icon:'❌',label:'Failed'},
  pending:     {c:'#94a3b8',bg:'#f8fafc',b:'#e2e8f0',icon:'⏳',label:'Pending'},
const CHECK_STATUS_COLOR = {clear:'#10b981',in_progress:'#3b82f6',flag:'#f59e0b',failed:'#ef4444',pending:'#94a3b8'}

export default function BackgroundVerificationPage() {
  const [records, setRecords] = useState(BGV_RECORDS)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [ctx, setCtx]             = useState(null)
  const [msg, setMsg]             = useState('')
  const [form, setForm]           = useState({candidate:'',position:'',dept:'IT',agency:'VerifyNepal Pvt. Ltd.',initiated_date:'',checks:[]})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const filtered = records.filter(r=>{
    if (filter!=='all'&&r.status!==filter) return false
    if (search&&!r.candidate.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const clearCount = records.filter(r=>r.status==='clear').length
  const inProgress = records.filter(r=>r.status==='in_progress').length
  const flagged    = records.filter(r=>r.status==='flag').length

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="🔍" title="Background Verification"
        breadcrumb="Employee Lifecycle > Recruitment > Background Verification"
        gradient={G}
        stats={[
          {icon:'🔍',label:'Total BGV',      value:records.length},
          {icon:'✅',label:'All Clear',       value:clearCount},
          {icon:'🔄',label:'In Progress',     value:inProgress},
          {icon:'⚠️',label:'Flagged',         value:flagged},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Initiate BGV"
        onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#92400e',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖️</span>
        <div><strong>Nepal BGV Requirements:</strong> Candidate written consent required before initiating. Police clearance (Nepal Police) mandatory for finance and security roles. All data handled per Privacy Act 2075.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by candidate name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','clear','in_progress','flag','failed'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,
                background:filter===s?'#fff':'transparent',color:filter===s?A:'#64748b',
                fontWeight:filter===s?700:400,boxShadow:filter===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]||STATUS_CFG.pending
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.candidate,...r}})}}
              style={{background:'#fff',borderRadius:14,border:`1px solid ${sc.b}`,boxShadow:'0 2px 8px rgba(0,0,0,.04)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:14,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.candidate}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.position} · {r.dept} · Agency: {r.agency}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Initiated: {r.initiated_date}{r.completed_date?' · Completed: '+r.completed_date:' · Ongoing'}</div>
                </div>
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                  {Object.entries(r.checks).map(([check,status])=>(
                    <span key={check} style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,background:`${CHECK_STATUS_COLOR[status]||'#94a3b8'}15`,color:CHECK_STATUS_COLOR[status]||'#94a3b8',border:`1px solid ${CHECK_STATUS_COLOR[status]||'#94a3b8'}30`}}>
                      {status==='clear'?'✓':status==='flag'?'⚠':status==='in_progress'?'🔄':'⏳'} {check.replace(/_/g,' ')}
                    </span>
                  ))}
                </div>
                {r.notes&&<div style={{fontSize:10,color:'#475569',fontStyle:'italic',padding:'6px 10px',background:'#f8fafc',borderRadius:8}}>📝 {r.notes}</div>}
              </div>
              <div style={{padding:'8px 14px',borderTop:'1px solid #f8fafc',display:'flex',gap:6,justifyContent:'flex-end'}}>
                <button onClick={()=>setSelected(r)} style={{padding:'6px 12px',borderRadius:7,border:`1px solid ${A}33`,background:`${A}10`,color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>👁 View</button>
                <button onClick={()=>notify('📧 Status update sent to HR team for '+r.candidate)} style={{padding:'6px 12px',borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>📧 Send Update</button>
                {r.status==='clear'&&<button onClick={()=>notify('✅ BGV cleared — Offer Management notified for '+r.candidate)} style={{padding:'6px 12px',borderRadius:7,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Proceed to Offer</button>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Initiate BGV Modal */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:520,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>🔍 Initiate Background Verification</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {[['Candidate Name *','candidate','text'],['Position *','position','text'],['Initiation Date','initiated_date','date']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                {[['Department','dept',['IT','Finance','HR','Operations','Sales','Facilities']],
                  ['BGV Agency','agency',['VerifyNepal Pvt. Ltd.','TrustCheck Nepal','GlobalVerify Nepal','ClearCheck Services']]].map(([l,f,opts])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <select value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',background:'#fff',boxSizing:'border-box'}}>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:6}}>Checks to Run</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  {CHECK_TYPES.map(c=>(
                    <label key={c} style={{display:'flex',gap:6,alignItems:'center',padding:'6px 10px',borderRadius:8,border:'1px solid #e2e8f0',cursor:'pointer'}}>
                      <input type="checkbox" checked={form.checks.includes(c)} onChange={()=>setForm(p=>({...p,checks:p.checks.includes(c)?p.checks.filter(x=>x!==c):[...p.checks,c]}))} style={{accentColor:A}}/>
                      <span style={{fontSize:10,color:'#374151'}}>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.candidate||!form.position){notify('⚠️ Candidate and position required');return}
                  const newRec = {
                    id:'b'+Date.now(),candidate:form.candidate,position:form.position,dept:form.dept,
                    status:'in_progress',initiated_date:form.initiated_date||new Date().toISOString().split('T')[0],
                    completed_date:null,agency:form.agency,
                    checks:form.checks.reduce((acc,c)=>({...acc,[c.replace(/ /g,'_')]:'pending'}),{}),
                    notes:'BGV initiated. Checks in progress.',impact_links:['Offer Management']
                  setRecords(p=>[...p,newRec])
                  notify('✅ BGV initiated for '+form.candidate+' via '+form.agency)
                  setShowAdd(false)
                  setForm({candidate:'',position:'',dept:'IT',agency:'VerifyNepal Pvt. Ltd.',initiated_date:'',checks:[]})
                }} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>🔍 Initiate BGV</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[{icon:'👁',label:'View',key:'view'},{icon:'📧',label:'Send Update',key:'notify'},{icon:'✅',label:'Mark Clear',key:'clear'},{icon:'⚠️',label:'Raise Flag',key:'flag',danger:true}]} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Background Verification" columns={['Candidate','Position','Dept','Status','Agency','Initiated','Completed','Checks','Notes']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Candidate',selected?.candidate],['Position',selected?.position],['Department',selected?.dept],
        ['Status',selected?.status],['Agency',selected?.agency],
        ['Initiated',selected?.initiated_date],['Completed',selected?.completed_date||'In Progress'],
        ['Notes',selected?.notes],
      ]}/>
    </div>
  )

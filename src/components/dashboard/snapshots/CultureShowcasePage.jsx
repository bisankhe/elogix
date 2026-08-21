// FILE: CultureShowcasePage.jsx - Culture Showcase
// DEI metrics, ESG initiatives, day-in-the-life content
import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#78350f 0%,#d97706 60%,#fcd34d 100%)'
const A = '#d97706'

const MOCK_DATA = [
  {id:'x1', name:'Culture Showcase Item 1', category:'primary', status:'live', engagement:1240, consent:true, date:'2025-06-10', priority:'high', notes:'Top performing content. High employee engagement.'},
  {id:'x2', name:'Culture Showcase Item 2', category:'secondary', status:'draft', engagement:0, consent:true, date:'2025-06-15', priority:'medium', notes:'Pending final review before publish.'},
  {id:'x3', name:'Culture Showcase Item 3', category:'primary', status:'live', engagement:890, consent:true, date:'2025-06-05', priority:'high', notes:'Strong reach on LinkedIn and Instagram.'},
  {id:'x4', name:'Culture Showcase Item 4', category:'event', status:'scheduled', engagement:0, consent:false, date:'2025-07-01', priority:'critical', notes:'Awaiting consent form from featured employee.'},
]

const STATUS_CFG = {
  live:      {c:'#10b981', bg:'#f0fdf4', icon:'🟢', label:'Live'},
  draft:     {c:'#94a3b8', bg:'#f8fafc', icon:'📝', label:'Draft'},
  scheduled: {c:'#f59e0b', bg:'#fffbeb', icon:'⏰', label:'Scheduled'},
  archived:  {c:'#64748b', bg:'#f8fafc', icon:'📦', label:'Archived'},

const CTX_ACTIONS = [
  {icon:'👁', label:'View Details',      key:'view'},
  {icon:'✏', label:'Edit Content',       key:'edit'},
  {icon:'📤', label:'Publish / Schedule', key:'publish'},
  {icon:'📊', label:'View Engagement',    key:'analytics'},
  {icon:'🔗', label:'Impact Analysis',    key:'impact'},
  {icon:'📤', label:'Export',             key:'export'},
  {icon:'🗑', label:'Archive',            key:'archive', danger:true},
]

const IMPACT_LINKS = ['Career Page','EVP Management','Recruitment Campaign','Social Media Branding']

export default function CultureShowcasePage() {
  const [items, setItems]         = useState(MOCK_DATA)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [selected, setSelected]   = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]             = useState(null)

  const filtered = items.filter(i=>{
    if (filterStatus!=='all'&&i.status!==filterStatus) return false
    if (search&&!i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const liveCount       = items.filter(i=>i.status==='live').length
  const totalEngagement = items.reduce((s,i)=>s+i.engagement,0)
  const pendingConsent  = items.filter(i=>!i.consent).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🌟" title="Culture Showcase"
        breadcrumb="Employee Lifecycle > Recruitment > Employer Branding"
        gradient={G}
        stats={[
          {icon:'🌟',label:'Total Items',     value:items.length},
          {icon:'🟢',label:'Live',                 value:liveCount},
          {icon:'📊',label:'Total Engagement',     value:totalEngagement.toLocaleString()},
          {icon:'⚠',label:'Pending Consent',      value:pendingConsent},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Create New"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:`${A}08`,border:`1px solid ${A}22`,borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:A,display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Compliance:</strong> Employee photos/testimonials require explicit written consent per privacy law. Branding materials must not feature minors. Claims must reflect actual employment terms (Consumer Protection Act).</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search culture showcase..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','live','draft','scheduled','archived'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
        {filtered.map(item=>{
          const sc = STATUS_CFG[item.status]||STATUS_CFG.draft
          return (
            <LuxCard key={item.id} color={A} onClick={()=>setSelected(item)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:item.name,...item}})}}>
              <div style={{padding:'14px 16px 10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:3}}>{item.name}</div>
                    <div style={{display:'flex',gap:5}}>
                      <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                      <span style={{background:'#fef9c3',color:'#854d0e',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,textTransform:'uppercase'}}>{item.priority}</span>
                      {!item.consent&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>No Consent</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:A}}>{item.engagement.toLocaleString()}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>ENGAGEMENT</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{item.category} . {item.date}</div>
                <div style={{fontSize:10,color:'#64748b',fontStyle:'italic',marginTop:6}}>🤖 {item.notes}</div>
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                <button onClick={ev=>{ev.stopPropagation();setItems(p=>p.map(i=>i.id===item.id?{...i,status:'live'}:i))}} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>Publish</button>
                <button onClick={ev=>{ev.stopPropagation();notify('📡 Distributed to LinkedIn, Facebook, Instagram & Merojob!')}} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:'#fffbeb',color:'#b45309',fontSize:10,fontWeight:700,cursor:'pointer'}}>Distribute</button>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:640,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Create Culture Showcase Item</div></div>
            <div style={{padding:'22px 28px'}}>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div style={{gridColumn:'1/-1'}}><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Title / Name *</label><input value={form.name_title||''} onChange={e=>setForm(p=>({...p,name_title:e.target.value}))} placeholder='Enter Culture Showcase title...' style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Publish Date</label><input type='date' value={form.date||''} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Priority</label><select value={form.priority||'medium'} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['critical','high','medium','low'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div style={{gridColumn:'1/-1'}}><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Description / Notes</label><textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} placeholder='Describe this culture showcase...' style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/></div>
              </div>
              <AIImpact color={A} lines={['Content auto-syncs to Career Page and Social Media channels.','Engagement tracked in real-time across all platforms.','Consent required before any employee image/quote goes live.','AI suggests optimal publish time based on audience activity.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{if(!form.name_title){notify('Please enter a title');return}const newItem={id:'x'+Date.now(),...form,status:'draft',engagement:0,date:form.date||new Date().toISOString().split('T')[0]};setItems(p=>[newItem,...p]);setShowAdd(false);setForm({});notify('✅ Created: '+form.name_title)}} style={{flex:1,padding:12,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>💾 Save Draft</button>
                <button onClick={()=>{if(!form.name_title){notify('Please enter a title');return}const newItem={id:'x'+Date.now(),...form,status:'live',engagement:0,date:form.date||new Date().toISOString().split('T')[0]};setItems(p=>[newItem,...p]);setShowAdd(false);setForm({});notify('🚀 Published & HRMS notified: '+form.name_title+' — All staff notified')}} style={{flex:1,padding:12,borderRadius:12,border:'none',background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>🚀 Publish & Notify All</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={IMPACT_LINKS} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Culture Showcase" columns={['Name','Category','Status','Engagement','Consent','Date','Priority','Notes']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Name',selected?.name],['Category',selected?.category],['Status',selected?.status],
        ['Engagement',selected?.engagement],['Consent Obtained',selected?.consent?'Yes':'NO - REQUIRED'],
        ['Date',selected?.date],['Priority',selected?.priority],['Notes',selected?.notes],
      ]}/>
    </div>
  )

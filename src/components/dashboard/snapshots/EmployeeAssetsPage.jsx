// FILE: EmployeeAssetsPage.jsx - Employee Assets (Employee Database)
// "My Equipment" visual grid, status tags, serial numbers, custody/return tracking

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#431407 0%,#c2410c 60%,#fb923c 100%)'
const A = '#c2410c'

const ASSETS = [
  { id:'a1', employee:'Gita Maharjan', item:'Laptop', model:'Dell Latitude 5540', serial:'DL-5540-2025-008',
    issue_date:'2025-06-18', value_npr:135000, status:'assigned', condition:'New', custody_signed:true,
    impact_links:['Asset Allocation','Offboarding Checklist'] },
  { id:'a2', employee:'Gita Maharjan', item:'Monitor', model:'Dell 24" UltraSharp', serial:'MON-2025-041',
    issue_date:'2025-06-18', value_npr:28000, status:'assigned', condition:'New', custody_signed:true,
    impact_links:['Asset Allocation'] },
  { id:'a3', employee:'Gita Maharjan', item:'Access Card', model:'RFID Badge', serial:'B-2025-021',
    issue_date:'2025-06-18', value_npr:500, status:'assigned', condition:'New', custody_signed:true,
    impact_links:['Asset Allocation'] },
  { id:'a4', employee:'Maya Pradhan', item:'Laptop', model:'HP EliteBook 840', serial:'HP-840-2025-012',
    issue_date:'2025-06-11', value_npr:142000, status:'assigned', condition:'Good', custody_signed:true,
    impact_links:['Asset Allocation'] },
  { id:'a5', employee:'Hari Thapa', item:'Laptop', model:'Dell Latitude 5440', serial:'DL-5440-2024-019',
    issue_date:'2025-05-22', value_npr:128000, status:'in_repair', condition:'Screen damage', custody_signed:true,
    impact_links:[] },
]

const STATUS_CFG = {
  assigned:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Assigned'},
  in_repair:{c:'#f59e0b',bg:'#fffbeb',icon:'🔧',label:'In Repair'},
  returned:{c:'#94a3b8',bg:'#f8fafc',icon:'↩',label:'Returned'},
const ITEM_ICONS = {Laptop:'💻',Monitor:'🖥','Access Card':'🪪',Phone:'📱',Chair:'🪑',Headset:'🎧'}

export default function EmployeeAssetsPage() {
  const [assets, setAssets] = useState(ASSETS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = assets.filter(a=>!search||a.employee.toLowerCase().includes(search.toLowerCase())||a.item.toLowerCase().includes(search.toLowerCase()))
  const totalValue = assets.reduce((s,a)=>s+a.value_npr,0)
  const inRepairCount = assets.filter(a=>a.status==='in_repair').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💼" title="Employee Assets"
        breadcrumb="Employee Lifecycle > Employee Records > Employee Database"
        gradient={G}
        stats={[
          {icon:'💼',label:'Total Assets',  value:assets.length},
          {icon:'✅',label:'Assigned',       value:assets.filter(a=>a.status==='assigned').length},
          {icon:'🔧',label:'In Repair',      value:inRepairCount},
          {icon:'💰',label:'Total Value',    value:'NPR '+(totalValue/1000).toFixed(0)+'K'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Assign Asset"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#9a3412',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>📋</span>
        <div><strong>Liability Tracking:</strong> Asset custody forms/sign-off sheets ensure accountability and track company property recovery upon termination - a Nepal best practice recommendation alongside the Labour Act's broader recordkeeping requirements.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee or item..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(a=>{
          const sc = STATUS_CFG[a.status]
          return (
            <LuxCard key={a.id} color={sc.c} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.item,...a}})}}>
              <div style={{padding:'16px 16px 10px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${sc.c}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{ITEM_ICONS[a.item]||'📦'}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{a.item}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{a.model}</div>
                  <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,marginTop:4,display:'inline-block'}}>{sc.icon} {sc.label}</span>
                </div>
              </div>
              <div style={{padding:'0 16px 10px',fontSize:10,color:'#64748b'}}>
                <div>👤 {a.employee}</div>
                <div>S/N: {a.serial}</div>
                <div>Issued: {a.issue_date} . NPR {a.value_npr.toLocaleString()}</div>
                {a.status==='in_repair'&&<div style={{color:'#f59e0b',marginTop:4}}>⚠ {a.condition}</div>}
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
                <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${sc.c}12`,color:sc.c,fontSize:10,fontWeight:700,cursor:'pointer'}}>View Receipt</button>
                <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer'}}>Report Issue</button>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Assign Asset</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Employee</label><select value={form.employee||''} onChange={e=>setForm(p=>({...p,employee:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Gita Maharjan','Maya Pradhan','Hari Thapa'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Item Type</label><select value={form.item_type||''} onChange={e=>setForm(p=>({...p,item_type:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Laptop','Monitor','Access Card','Phone','Chair','Headset'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Model</label><input type="text" value={form.model||''} onChange={e=>setForm(p=>({...p,model:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Serial Number</label><input type="text" value={form.serial_number||''} onChange={e=>setForm(p=>({...p,serial_number:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Value (NPR)</label><input type="number" value={form.value_npr||''} onChange={e=>setForm(p=>({...p,value_npr:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Issue Date</label><input type="date" value={form.issue_date||''} onChange={e=>setForm(p=>({...p,issue_date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
              </div>
              <AIImpact color={A} lines={['Custody receipt auto-generated for employee signature.','Asset tracked through offboarding for mandatory recovery.','Biannual hardware audit reconciles physical inventory with this record.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Assign & Generate Receipt</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Receipt',key:'view'},{icon:'🔧',label:'Mark for Repair',key:'repair'},
        {icon:'↩',label:'Mark Returned',key:'return'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Employee Assets" columns={['Employee','Item','Model','Serial','Issue Date','Value NPR','Status','Custody Signed']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

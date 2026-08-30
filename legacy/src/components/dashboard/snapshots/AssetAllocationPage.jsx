// FILE: AssetAllocationPage.jsx - Asset Allocation (Employee Joining)
// Logistics hub: shipping preferences, hardware selection, serial tracking, signed receipt

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#431407 0%,#c2410c 60%,#fb923c 100%)'
const A = '#c2410c'

const ALLOCATIONS = [
  { id:'al1', employee:'Gita Maharjan', position:'Cloud Architect', work_mode:'on_site', branch:'KTM HQ',
    items:[
      {item:'Laptop',model:'Dell Latitude 5540',serial:'DL-5540-2025-008',status:'delivered'},
      {item:'Monitor',model:'Dell 24" UltraSharp',serial:'MON-2025-041',status:'delivered'},
      {item:'Access Card',model:'RFID Badge',serial:'B-2025-021',status:'delivered'},
    ],
    shipping_address:'KTM HQ Office, New Baneshwor', preference:'Mac vs PC: PC', signed_receipt:true,
    impact_links:['Orientation Program','Department Introduction'] },
  { id:'al2', employee:'Sunita Rai', position:'Senior Software Developer', work_mode:'hybrid', branch:'KTM HQ',
    items:[
      {item:'Laptop',model:'Pending Selection',serial:null,status:'pending'},
      {item:'Headset',model:'Pending Selection',serial:null,status:'pending'},
    ],
    shipping_address:'', preference:'', signed_receipt:false,
    impact_links:[] },
  { id:'al3', employee:'Maya Pradhan', position:'Finance Manager', work_mode:'on_site', branch:'KTM HQ',
    items:[
      {item:'Laptop',model:'HP EliteBook 840',serial:'HP-840-2025-012',status:'delivered'},
      {item:'Access Card',model:'RFID Badge',serial:'B-2025-019',status:'delivered'},
      {item:'Ergonomic Chair',model:'Herman Miller Aeron',serial:'CHR-2025-005',status:'in_transit'},
    ],
    shipping_address:'KTM HQ Office, New Baneshwor', preference:'Ergonomic chair requested', signed_receipt:true,
    impact_links:['Orientation Program'] },
]

const STATUS_CFG = {delivered:{c:'#10b981',icon:'✅'},in_transit:{c:'#f59e0b',icon:'🚚'},pending:{c:'#94a3b8',icon:'⏳'}}
const HARDWARE_OPTIONS = ['Laptop (Dell Latitude)','Laptop (MacBook Pro)','Monitor (24" UltraSharp)','Headset','Keyboard & Mouse','Ergonomic Chair','Mobile Phone','Access Card']

export default function AssetAllocationPage() {
  const [allocations, setAllocations] = useState(ALLOCATIONS)

  const [form, setForm] = useState({})
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = allocations.filter(a=>!search||a.employee.toLowerCase().includes(search.toLowerCase()))

  const totalItems = allocations.reduce((s,a)=>s+a.items.length,0)
  const deliveredItems = allocations.reduce((s,a)=>s+a.items.filter(i=>i.status==='delivered').length,0)
  const pendingSelections = allocations.reduce((s,a)=>s+a.items.filter(i=>i.status==='pending').length,0)
  const signedReceipts = allocations.filter(a=>a.signed_receipt).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💼" title="Asset Allocation"
        breadcrumb="Employee Lifecycle > Onboarding > Employee Joining"
        gradient={G}
        stats={[
          {icon:'📦',label:'Total Items',     value:totalItems},
          {icon:'✅',label:'Delivered',        value:deliveredItems},
          {icon:'⏳',label:'Pending Selection',value:pendingSelections},
          {icon:'📝',label:'Signed Receipts',  value:signedReceipts},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Allocate Asset"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#9a3412',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>📋</span>
        <div><strong>Nepal Compliance:</strong> Employer must record all company property issued and obtain a signed asset receipt form from the employee - standard practice for security, tax, and offboarding traceability.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(a=>{
          const hasPending = a.items.some(i=>i.status==='pending')
          return (
            <LuxCard key={a.id} color={hasPending?'#f59e0b':'#10b981'} onClick={()=>setSelected(a)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.employee,...a}})}}>
              <div style={{padding:'14px 16px 8px'}}>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{a.employee}</span>
                  <span style={{background:a.work_mode==='hybrid'?'#eff6ff':'#f0fdf4',color:a.work_mode==='hybrid'?'#1d4ed8':'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,textTransform:'capitalize'}}>{a.work_mode}</span>
                </div>
                <div style={{fontSize:10,color:'#64748b',marginBottom:8}}>{a.position} . {a.branch}</div>

                {a.items.map((it,i)=>{
                  const sc = STATUS_CFG[it.status]
                  return (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid #f8fafc'}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:600,color:'#0f172a'}}>{it.item}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{it.model}{it.serial?` . S/N: ${it.serial}`:''}</div>
                      </div>
                      <span style={{fontSize:10,color:sc.c,fontWeight:700}}>{sc.icon}</span>
                    </div>
                  )
                })}

                {a.preference && <div style={{marginTop:8,fontSize:9,color:'#64748b',fontStyle:'italic'}}>📝 {a.preference}</div>}
                <div style={{marginTop:8,display:'flex',gap:6}}>
                  <span style={{background:a.signed_receipt?'#f0fdf4':'#fef2f2',color:a.signed_receipt?'#15803d':'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                    {a.signed_receipt?'✓ Receipt Signed':'✗ Receipt Pending'}
                  </span>
                </div>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:660,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Allocate Asset</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Employee</label><select value={form.employee||''} onChange={e=>setForm(p=>({...p,employee:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['Sunita Rai','Priya Khadka'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Work Mode</label><select value={form.work_mode||''} onChange={e=>setForm(p=>({...p,work_mode:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}>{['on_site','hybrid','remote'].map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Hardware Item</label><input type="text" value={form.hardware_item||''} onChange={e=>setForm(p=>({...p,hardware_item:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <div><label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Serial Number</label><input type="text" value={form.serial_number||''} onChange={e=>setForm(p=>({...p,serial_number:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
                <Field label="Shipping Address" value="" onChange={e=>setForm(p=>({...p,[e.target.name||'field']:e.target.value}))} accent={A} hint="Voice input - for remote/hybrid"/>
              </div>
              <AIImpact color={A} lines={['Direct API push notifies IT/Facilities to dispatch hardware.','Asset serial numbers auto-link to employee digital file.','Signed receipt required before allocation marked complete.','Tracked for offboarding return reconciliation.']}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Allocate & Notify IT</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Allocation',key:'view'},{icon:'📥',label:'Download Receipt Form',key:'receipt'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Asset Allocation" columns={['Employee','Work Mode','Item','Model','Serial Number','Status','Signed Receipt']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

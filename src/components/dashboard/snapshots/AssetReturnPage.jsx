// FILE: AssetReturnPage.jsx - Asset Return (Exit Management)
// Reverse of onboarding allocation: photo-upload sign-off, condition check, 24-48hr wipe window

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#431407 0%,#c2410c 60%,#fb923c 100%)'
const A = '#c2410c'

const RETURNS = [
  { id:'ar1', employee:'Dipendra Yadav', lwd:'2025-07-10',
    items:[
      {item:'Laptop',model:'Dell Latitude 5440',serial:'DL-5440-2024-019',status:'returned',condition:'Good',photo_uploaded:true,wiped:true},
      {item:'Access Card',model:'RFID Badge',serial:'B-2025-019',status:'returned',condition:'Good',photo_uploaded:true,wiped:false},
    ],
    all_returned:true, deduction_npr:0,
    impact_links:['Exit Clearance','Final Settlement'] },
  { id:'ar2', employee:'Anjali Sharma', lwd:'2025-06-22',
    items:[
      {item:'Laptop',model:'HP EliteBook 830',serial:'HP-830-2023-007',status:'pending',condition:null,photo_uploaded:false,wiped:false},
      {item:'Mobile Phone',model:'Samsung A54',serial:'SM-2023-014',status:'pending',condition:null,photo_uploaded:false,wiped:false},
      {item:'Access Card',model:'RFID Badge',serial:'B-2024-088',status:'returned',condition:'Good',photo_uploaded:true,wiped:false},
    ],
    all_returned:false, deduction_npr:0,
    impact_links:['Exit Clearance'] },
]

const STATUS_CFG = {returned:{c:'#10b981',icon:'✅',label:'Returned'},pending:{c:'#f59e0b',icon:'⏳',label:'Pending'},damaged:{c:'#ef4444',icon:'⚠',label:'Damaged'}}
const ITEM_ICONS = {Laptop:'💻',Monitor:'🖥','Access Card':'🪪','Mobile Phone':'📱',Chair:'🪑',Headset:'🎧'}

export default function AssetReturnPage() {
  const [returns, setReturns] = useState(RETURNS)
  const [search, setSearch] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({employee:'',lwd:'',item:'',model:'',serial:'',approver:''})
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const filtered = returns.filter(r=>!search||r.employee.toLowerCase().includes(search.toLowerCase()))
  const totalItems = returns.reduce((s,r)=>s+r.items.length,0)
  const returnedItems = returns.reduce((s,r)=>s+r.items.filter(i=>i.status==='returned').length,0)
  const pendingWipe = returns.reduce((s,r)=>s+r.items.filter(i=>i.status==='returned'&&!i.wiped).length,0)

  const markReturned = (returnId, idx) => {
    setReturns(prev=>prev.map(r=>{
      if (r.id!==returnId) return r
      const items = r.items.map((it,i)=>i===idx?{...it,status:'returned',condition:'Good',photo_uploaded:true}:it)
      return {...r, items, all_returned:items.every(i=>i.status==='returned')}
    }))
  }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📦" title="Asset Return"
        breadcrumb="Employee Lifecycle > Offboarding > Exit Management"
        gradient={G}
        stats={[
          {icon:'📦',label:'Total Items',     value:totalItems},
          {icon:'✅',label:'Returned',         value:returnedItems},
          {icon:'⏳',label:'Pending',          value:totalItems-returnedItems},
          {icon:'🧹',label:'Awaiting Wipe',    value:pendingWipe},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="+ Add Return Record" onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⏰</span>
        <div><strong>24-48hr Data Wipe Window:</strong> All equipment should be collected at least 24-48 hours prior to final departure, allowing IT time to securely wipe data. Return of assets is a mandatory condition for releasing the Full & Final settlement.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(r=>(
          <LuxCard key={r.id} color={r.all_returned?'#10b981':'#f59e0b'}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}>
            <div style={{padding:'14px 16px 8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>LWD: {r.lwd}</div>
                </div>
                <span style={{background:r.all_returned?'#f0fdf4':'#fffbeb',color:r.all_returned?'#15803d':'#b45309',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>
                  {r.all_returned?'✅ All Returned':'⏳ In Progress'}
                </span>
              </div>

              {r.items.map((it,i)=>{
                const sc = STATUS_CFG[it.status]
                return (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #f8fafc'}}>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{fontSize:16}}>{ITEM_ICONS[it.item]||'📦'}</span>
                      <div>
                        <div style={{fontSize:11,fontWeight:600,color:'#0f172a'}}>{it.item}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{it.model} . S/N: {it.serial}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <span style={{fontSize:10,color:sc.c,fontWeight:700}}>{sc.icon} {sc.label}</span>
                      {it.status==='pending'&&<button onClick={()=>markReturned(r.id,i)} style={{display:'block',marginTop:3,padding:'3px 10px',borderRadius:6,border:'none',background:`${A}15`,color:A,fontSize:9,fontWeight:700,cursor:'pointer'}}>Mark Returned</button>}
                      {it.status==='returned'&&!it.wiped&&<div style={{fontSize:8,color:'#f59e0b',marginTop:2}}>🧹 Wipe pending</div>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
              <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>📸 Upload Return Photo</button>
              <button style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>Generate Receipt</button>
            </div>
          </LuxCard>
        ))}
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:0,width:500,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'16px 22px',borderRadius:'18px 18px 0 0',color:'#fff'}}>
              <div style={{fontSize:14,fontWeight:900}}>📦 Record Asset Return</div>
              <div style={{fontSize:10,opacity:.8,marginTop:2}}>Assets returned are recorded in approver name and added to inventory stock</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {[['Employee Name *','employee','text'],['Last Working Date','lwd','date'],
                  ['Asset / Item *','item','text'],['Model / Description','model','text'],
                  ['Serial Number','serial','text'],['Receiving Approver *','approver','text']].map(([l,f,t])=>(
                  <div key={f}>
                    <label style={{fontSize:9,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>{l}</label>
                    <input type={t} value={form[f]} onChange={e=>setForm(p=>({...p,[f]:e.target.value}))}
                      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:10,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
              </div>
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:10,color:'#92400e'}}>
                ⚠️ The approver who signs off on this return will be responsible for these assets. They will be added to company inventory under the approver's custody.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  if(!form.employee||!form.item||!form.approver){notify('⚠️ Employee, item and approver required');return}
                  setReturns(prev=>[...prev,{id:'ar'+Date.now(),employee:form.employee,lwd:form.lwd||'TBD',
                    items:[{item:form.item,model:form.model||'',serial:form.serial||'',status:'returned',condition:'Good',photo_uploaded:false,wiped:false,approver:form.approver}],
                    all_returned:true,deduction_npr:0,impact_links:['Exit Clearance','Final Settlement']}])
                  notify('✅ Asset return recorded. '+form.item+' added to inventory under '+form.approver)
                  setShowAdd(false)
                  setForm({employee:'',lwd:'',item:'',model:'',serial:'',approver:''})
                }} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>📦 Record Return & Add to Stock</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Items',key:'view'},{icon:'📸',label:'Upload Photo',key:'photo'},
        {icon:'🧹',label:'Mark Data Wiped',key:'wipe'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Asset Return" columns={['Employee','LWD','Item','Model','Serial','Status','Condition','Photo Uploaded','Data Wiped']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}

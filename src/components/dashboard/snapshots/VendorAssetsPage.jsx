// FILE: VendorAssetsPage.jsx - Inventory & Assets Management
// Barcode/QR tracking, lifecycle alerts, onboarding/offboarding automation

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)'
const A = '#0369a1'

const ASSETS = [
  { id:'as1', asset_code:'AST-2024-001', name:'Security Uniform Set (Full)', category:'uniform',
    assigned_to:'VE-001', assigned_name:'Ramesh Bahadur Shrestha', assigned_vendor:'ShieldGuard Nepal',
    condition:'good', assigned_date:'2024-07-01', return_date:null,
    serial_no:null, value_npr:3500, status:'assigned',
    location:'KTM HQ - Security Room', last_checked:'2025-01-15',
    icon:'👔', color:'#7c3aed',
    impact_links:['Vendor Profile','Offboarding Checklist'] },
  { id:'as2', asset_code:'AST-2024-002', name:'Access Control Badge', category:'badge',
    assigned_to:'VE-001', assigned_name:'Ramesh Bahadur Shrestha', assigned_vendor:'ShieldGuard Nepal',
    condition:'good', assigned_date:'2024-07-01', return_date:null,
    serial_no:'BADGE-KTM-041', value_npr:800, status:'assigned',
    location:'KTM HQ', last_checked:'2025-06-01',
    icon:'🪪', color:'#0369a1',
    impact_links:['Attendance','Security','Offboarding Checklist'] },
  { id:'as3', asset_code:'AST-2024-003', name:'Cleaning Equipment Kit', category:'equipment',
    assigned_to:'VE-002', assigned_name:'Sunita Gurung', assigned_vendor:'CleanPro Services',
    condition:'good', assigned_date:'2024-09-01', return_date:null,
    serial_no:null, value_npr:12000, status:'assigned',
    location:'KTM HQ - Supply Room', last_checked:'2025-03-10',
    icon:'🧹', color:'#059669',
    impact_links:['Vendor Profile','Offboarding Checklist'] },
  { id:'as4', asset_code:'AST-2025-004', name:'Laptop (Dell Latitude 5540)', category:'it_hardware',
    assigned_to:'VE-003', assigned_name:'Bikash Tamang', assigned_vendor:'TechStaff Solutions',
    condition:'good', assigned_date:'2025-01-15', return_date:null,
    serial_no:'DL-5540-2025-KTM-008', value_npr:125000, status:'assigned',
    location:'KTM HQ - IT Dept', last_checked:'2025-06-10',
    icon:'💻', color:'#dc2626',
    impact_links:['IT Security','Offboarding Checklist','Data Security'] },
  { id:'as5', asset_code:'AST-2024-005', name:'Company Vehicle Key (Toyota Hilux)', category:'vehicle_key',
    assigned_to:null, assigned_name:null, assigned_vendor:null,
    condition:'good', assigned_date:null, return_date:'2025-03-31',
    serial_no:'KYA-2024-PJM-012', value_npr:500, status:'returned',
    location:'Admin Store Room', last_checked:'2025-04-01',
    icon:'🔑', color:'#f59e0b',
    impact_links:['Offboarding Checklist'] },
  { id:'as6', asset_code:'AST-2025-006', name:'Walkie-Talkie Radio (Motorola XT420)', category:'communication',
    assigned_to:'VE-005', assigned_name:'Hari Prasad Rai', assigned_vendor:'ShieldGuard Nepal',
    condition:'fair', assigned_date:'2025-03-01', return_date:null,
    serial_no:'MOT-XT420-2025-BRT-005', value_npr:8500, status:'assigned',
    location:'Biratnagar Office', last_checked:'2025-05-20',
    icon:'📻', color:'#8b5cf6',
    impact_links:['Vendor Profile','Offboarding Checklist'] },
  { id:'as7', asset_code:'AST-2025-007', name:'PPE Safety Kit (Helmet + Vest)', category:'safety',
    assigned_to:null, assigned_name:'Unassigned', assigned_vendor:null,
    condition:'new', assigned_date:null, return_date:null,
    serial_no:null, value_npr:4500, status:'available',
    location:'KTM HQ - Safety Store', last_checked:'2025-06-01',
    icon:'🦺', color:'#10b981',
    impact_links:['Safety Committee','Nepal LA2074'] },
]

const CAT_CONFIG = {
  uniform:     {label:'Uniform',         icon:'👔', color:'#7c3aed'},
  badge:       {label:'Access Badge',    icon:'🪪', color:'#0369a1'},
  equipment:   {label:'Equipment',       icon:'🔧', color:'#059669'},
  it_hardware: {label:'IT Hardware',     icon:'💻', color:'#dc2626'},
  vehicle_key: {label:'Vehicle Key',     icon:'🔑', color:'#f59e0b'},
  communication:{label:'Communication',  icon:'📻', color:'#8b5cf6'},
  safety:      {label:'Safety/PPE',      icon:'🦺', color:'#10b981'},
}
const STATUS_CFG = {
  assigned:  {c:'#3b82f6',bg:'#eff6ff',label:'Assigned'},
  available: {c:'#10b981',bg:'#f0fdf4',label:'Available'},
  returned:  {c:'#64748b',bg:'#f8fafc',label:'Returned'},
  damaged:   {c:'#ef4444',bg:'#fef2f2',label:'Damaged'},
  lost:      {c:'#dc2626',bg:'#fef2f2',label:'Lost'},
}
const CTX_ACTIONS = [
  {icon:'👁',label:'View Asset Details',      key:'view'},
  {icon:'📋',label:'Assign to Employee',       key:'assign'},
  {icon:'↩',label:'Process Return',           key:'return'},
  {icon:'🔧',label:'Log Maintenance',          key:'maintenance'},
  {icon:'📍',label:'Track Location',           key:'track'},
  {icon:'🔗',label:'Impact Analysis',          key:'impact'},
  {icon:'📤',label:'Export Asset List',        key:'export'},
  {icon:'🗑',label:'Write Off Asset',          key:'writeoff', danger:true},
]

export default function VendorAssetsPage() {
  const [assets, setAssets] = useState(ASSETS)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = assets.filter(a=>{
    if (filterCat!=='all'&&a.category!==filterCat) return false
    if (filterStatus!=='all'&&a.status!==filterStatus) return false
    if (search&&!a.name.toLowerCase().includes(search.toLowerCase())&&!a.asset_code.toLowerCase().includes(search.toLowerCase())&&!(a.assigned_name||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const assigned  = assets.filter(a=>a.status==='assigned').length
  const available = assets.filter(a=>a.status==='available').length
  const totalValue = assets.filter(a=>a.status==='assigned').reduce((s,a)=>s+a.value_npr,0)
  const itAssets = assets.filter(a=>a.category==='it_hardware').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💼" title="Inventory & Assets"
        breadcrumb="Organization Management > Vendor / Outsource Employee Management"
        gradient={G}
        stats={[
          {icon:'📦',label:'Total Assets',  value:assets.length},
          {icon:'📋',label:'Assigned',       value:assigned},
          {icon:'✅',label:'Available',      value:available},
          {icon:'💰',label:'Assigned Value', value:'NPR '+(totalValue/1000).toFixed(0)+'K'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Asset"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',gap:10,fontSize:11,color:'#1e40af'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div><strong>IT Security Note:</strong> All IT hardware assigned to vendor employees must have system access DISABLED. Return tracking is automated. Nepal LA2074: Assets must be returned within 3 days of contract end.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by asset code, name, assigned employee..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9,flexWrap:'wrap'}}>
          {['all',...Object.keys(CAT_CONFIG)].map(c=>(
            <button key={c} onClick={()=>setFilterCat(c)}
              style={{padding:'7px 11px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterCat===c?'#fff':'transparent',color:filterCat===c?A:'#64748b',
                fontWeight:filterCat===c?700:400,boxShadow:filterCat===c?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {c==='all'?'All':CAT_CONFIG[c]?.icon+' '+CAT_CONFIG[c]?.label}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','assigned','available','returned'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 11px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
        {filtered.map(a=>{
          const sc = STATUS_CFG[a.status]||STATUS_CFG.available
          const cc = CAT_CONFIG[a.category]||{icon:'📦',color:'#64748b'}
          return (
            <LuxCard key={a.id} color={cc.color} onClick={()=>setSelected(a)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.name,...a}})}}>
              <div style={{padding:'14px 16px 8px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${cc.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{a.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a',marginBottom:2,lineHeight:1.3}}>{a.name}</div>
                  <div style={{fontSize:10,fontFamily:'monospace',color:cc.color,fontWeight:700,marginBottom:2}}>{a.asset_code}</div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                    <span style={{background:`${cc.color}12`,color:cc.color,fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:600}}>{cc.icon} {cc.label}</span>
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:11,fontWeight:800,color:cc.color}}>NPR {(a.value_npr/1000).toFixed(1)}K</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>ASSET VALUE</div>
                </div>
              </div>

              {a.assigned_to ? (
                <div style={{margin:'0 14px 10px',background:'#f8fafc',borderRadius:10,padding:'8px 12px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#0f172a',marginBottom:2}}>{a.assigned_name}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{a.assigned_vendor} . {a.assigned_to}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>Assigned: {a.assigned_date} . Location: {a.location}</div>
                </div>
              ) : (
                <div style={{margin:'0 14px 10px',background:'#f0fdf4',borderRadius:10,padding:'8px 12px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#15803d'}}>Available for Assignment</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>Location: {a.location}</div>
                </div>
              )}

              {a.serial_no && (
                <div style={{padding:'0 14px 8px',fontSize:10,color:'#94a3b8',fontFamily:'monospace'}}>S/N: {a.serial_no}</div>
              )}

              <div style={{padding:'0 14px 8px',fontSize:10,color:'#64748b'}}>
                <span>Condition: <strong style={{color:a.condition==='good'?'#10b981':a.condition==='new'?'#3b82f6':'#f59e0b'}}>{a.condition.toUpperCase()}</strong></span>
                <span style={{marginLeft:12}}>Checked: {a.last_checked}</span>
              </div>

              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 10px',display:'flex',gap:5}}>
                {a.status==='available' && (
                  <button onClick={ev=>ev.stopPropagation()} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Assign</button>
                )}
                {a.status==='assigned' && (
                  <button onClick={ev=>ev.stopPropagation()} style={{flex:1,padding:'7px',borderRadius:7,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer'}}>Return</button>
                )}
                <button onClick={ev=>{ev.stopPropagation();setSelected(a)}} style={{flex:1,padding:'7px',borderRadius:7,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>Details</button>
              </div>
            </LuxCard>
          )
        })}
      </div>

      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>+ Add Asset / Inventory Item</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>Voice input supported. Barcode/QR scan compatible.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Asset Code" value="" onChange={()=>{}} required accent={A} hint="e.g. AST-2025-008"/>
                <Field label="Asset Name" value="" onChange={()=>{}} required accent={A}/>
                <Field label="Category" type="select" value="" onChange={()=>{}} accent={A} options={Object.keys(CAT_CONFIG).map(k=>CAT_CONFIG[k].label)}/>
                <Field label="Value (NPR)" type="number" value="" onChange={()=>{}} accent={A}/>
                <Field label="Serial No." value="" onChange={()=>{}} accent={A}/>
                <Field label="Condition" type="select" value="" onChange={()=>{}} accent={A} options={['new','good','fair','poor']}/>
                <Field label="Storage Location" value="" onChange={()=>{}} accent={A}/>
              </div>
              <AIImpact color={A} lines={[
                'Asset links to employee/vendor profile for offboarding checklist automation.',
                'IT hardware assigned to vendor workers: system access NEVER enabled.',
                'AI tracks asset utilization and alerts on long-term unassigned assets.',
                'Return triggered automatically when contract expires.',
              ]}/>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Asset</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={CTX_ACTIONS} onAction={(k,item)=>{if(k==='view')setSelected(item)}} onClose={()=>setCtx(null)}/>}
      {showExcel && <ExcelModal title="Inventory & Assets" columns={['Asset Code','Name','Category','Serial No','Value NPR','Condition','Status','Assigned To','Assigned Date','Return Date','Location']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
      <Drawer item={selected} gradient={G} onClose={()=>setSelected(null)} rows={[
        ['Asset Code',selected?.asset_code],['Category',selected?.category],
        ['Serial No',selected?.serial_no||'N/A'],['Value','NPR '+(selected?.value_npr||0)],
        ['Condition',selected?.condition],['Status',selected?.status],
        ['Assigned To',selected?.assigned_name||'Unassigned'],['Vendor',selected?.assigned_vendor||'N/A'],
        ['Assigned Date',selected?.assigned_date||'N/A'],['Return Date',selected?.return_date||'N/A'],
        ['Location',selected?.location],['Last Checked',selected?.last_checked],
      ]}/>
    </div>
  )
}

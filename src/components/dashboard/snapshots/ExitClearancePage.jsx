// FILE: ExitClearancePage.jsx - Exit Clearance (Exit Management)
// Cross-departmental Kanban: IT, Finance, Facilities sign-off, F&F frozen until all clear

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const DEPT_CFG = {
  immediate_superior:{label:'Supervisor / HOD',icon:'👔',color:'#7c3aed',order:1,responsibility:'KT verification, pending tasks signed off, asset handover initiated'},
  it:               {label:'IT',              icon:'💻',color:'#3b82f6',order:2,responsibility:'Revoke email/VPN/software. Retrieve laptop, phone, USB. Wipe data. Update asset register.'},
  store_inventory:  {label:'Store & Inventory',icon:'📦',color:'#f97316',order:3,responsibility:'Retrieve company assets, uniforms, equipment. Record in stock.'},
  admin:            {label:'Administration',  icon:'🏢',color:'#f59e0b',order:4,responsibility:'Return access card, ID badge, car pass. Vacate desk. Issue locker clearance.'},
  hr:               {label:'HR',              icon:'👥',color:'#8b5cf6',order:5,responsibility:'Confirm exit interview done. Issue experience letter request. Update HRIS. Archive file.'},
  finance:          {label:'Finance',         icon:'💰',color:'#10b981',order:6,responsibility:'Settle advances, loans, pending claims. Confirm F&F computation. Release payout.'},

const CLEARANCES = [
  { id:'cl1', employee:'Dipendra Yadav', position:'Junior Accountant', lwd:'2025-07-10',
    departments:{
      immediate_superior:{status:'cleared',cleared_date:'2025-07-07',note:'KT completed. All tasks handed over to Rohan Karki.',approver:'Sanjay Karki (CFO)',assets_received:[]},
      it:{status:'cleared',cleared_date:'2025-07-08',note:'Laptop (DL-5440-019) returned. Email/VPN revoked. Data wiped.',approver:'Bikash Shrestha (IT Lead)',assets_received:['Laptop DL-5440-019','USB Key']},
      store_inventory:{status:'cleared',cleared_date:'2025-07-08',note:'No company assets on record.',approver:'Store Manager',assets_received:[]},
      admin:{status:'cleared',cleared_date:'2025-07-08',note:'Access card B-019 returned. Desk cleared.',approver:'Admin Manager',assets_received:['RFID Access Card B-019']},
      hr:{status:'cleared',cleared_date:'2025-07-10',note:'Exit interview completed. HRIS updated. File archived.',approver:'Priya Adhikari (HR)',assets_received:[]},
      finance:{status:'cleared',cleared_date:'2025-07-09',note:'No advance balance. Corporate card nil. F&F approved.',approver:'Sanjay Karki (CFO)',assets_received:[]},
    },
    ff_frozen:false, ff_amount_npr:142000, status:'fully_cleared',
    impact_links:['Asset Return','Final Settlement'] },
  { id:'cl2', employee:'Anjali Sharma', position:'Sales Executive', lwd:'2025-06-22',
    departments:{
      immediate_superior:{status:'cleared',cleared_date:'2025-06-21',note:'Partial KT done. 2 client accounts handed over.',approver:'Dipak Tamang',assets_received:[]},
      it:{status:'pending',cleared_date:null,note:null,approver:null,assets_received:[]},
      store_inventory:{status:'pending',cleared_date:null,note:null,approver:null,assets_received:[]},
      admin:{status:'cleared',cleared_date:'2025-06-21',note:'Access card returned.',approver:'Admin Manager',assets_received:['RFID Access Card B-088']},
      hr:{status:'pending',cleared_date:null,note:null,approver:null,assets_received:[]},
      finance:{status:'pending',cleared_date:null,note:null,approver:null,assets_received:[]},
    },
    ff_frozen:true, ff_amount_npr:48000, status:'in_progress',
    impact_links:['Asset Return','Exit Interview'] },
]

const STATUS_CFG = {cleared:{c:'#10b981',icon:'✅'},pending:{c:'#f59e0b',icon:'⏳'},flagged:{c:'#ef4444',icon:'⚠'}}

export default function ExitClearancePage() {
  const [clearances, setClearances] = useState(CLEARANCES)
  const [search, setSearch] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = clearances.filter(c=>!search||c.employee.toLowerCase().includes(search.toLowerCase()))
  const frozenCount = clearances.filter(c=>c.ff_frozen).length

  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3500) }

  const clearDept = (clearanceId, dept, note='Cleared via dashboard') => {
    setClearances(prev=>prev.map(c=>{
      if (c.id!==clearanceId) return c
      const dc = DEPT_CFG[dept]
      const departments = {...c.departments, [dept]:{
        status:'cleared',cleared_date:new Date().toISOString().split('T')[0],
        note:note, approver:'Current User', assets_received:[]
      }}
      const allCleared = Object.values(departments).every(d=>d.status==='cleared')
      notify('✅ '+dc.label+' clearance recorded. '+dc.responsibility)
      return {...c, departments, ff_frozen:!allCleared, status:allCleared?'fully_cleared':'in_progress'}
    }))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗂" title="Exit Clearance"
        breadcrumb="Employee Lifecycle > Offboarding > Exit Management"
        gradient={G}
        stats={[
          {icon:'🗂',label:'In Process',         value:clearances.length},
          {icon:'✅',label:'Fully Cleared',       value:clearances.filter(c=>c.status==='fully_cleared').length},
          {icon:'🔒',label:'F&F Frozen',          value:frozenCount},
          {icon:'💰',label:'Total F&F Pending',   value:'NPR '+clearances.filter(c=>c.ff_frozen).reduce((s,c)=>s+c.ff_amount_npr,0).toLocaleString()},
        ]}
        onAdd={()=>notify('✅ Exit clearance form generated and circulated to all departments serially.')} addLabel="+ Generate Clearance" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'linear-gradient(135deg,#eef2ff,#f5f3ff)',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔒</span>
        <div><strong>Full & Final Settlement Frozen Until All Cleared:</strong> Nepal Labour Act 2074 requires employer to clear all lawful dues (unpaid salary, overtime, leave encashment, SSF) - but disbursement is held until every department signs off, protecting company assets and finalizing accountability.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(c=>{
          const clearedCount = Object.values(c.departments).filter(d=>d.status==='cleared').length
          const pct = Math.round(clearedCount/Object.keys(c.departments).length*100)
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.employee,...c}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${c.ff_frozen?'#ef4444':'#10b981'}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{c.employee}</span>
                    <span style={{background:c.ff_frozen?'#fef2f2':'#f0fdf4',color:c.ff_frozen?'#dc2626':'#15803d',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>
                      {c.ff_frozen?'🔒 F&F Frozen':'✅ F&F Released'}
                    </span>
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{c.position} . LWD: {c.lwd}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:A}}>NPR {(c.ff_amount_npr/1000).toFixed(0)}K</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>F&F AMOUNT</div>
                </div>
              </div>

              <div style={{padding:'10px 20px',borderBottom:'1px solid #f8fafc'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:10}}>
                  <span style={{color:'#64748b'}}>Clearance Progress</span>
                  <span style={{fontWeight:700,color:A}}>{clearedCount}/4 departments</span>
                </div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:pct===100?'#10b981':A,borderRadius:8,transition:'width .5s'}}/>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:0}}>
                {Object.entries(c.departments).map(([key,dept])=>{
                  const sc = STATUS_CFG[dept.status]
                   const dc = DEPT_CFG[key] || {color:'#64748b',label:key,responsibility:''}
                  return (
                    <div key={key} style={{padding:'12px 14px',borderRight:'1px solid #f8fafc'}}>
                      <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
                        <span style={{fontSize:14}}>{sc.icon}</span>
                        <span style={{fontSize:10,fontWeight:800,color:sc.color}}>{sc.label}</span>
                        <span style={{marginLeft:'auto',fontSize:12}}>{sc.icon}</span>
                      </div>
                      {dept.note&&<div style={{fontSize:9,color:'#64748b',marginBottom:4}}>{dept.note}</div>}
                    {dept.approver&&<div style={{fontSize:8,color:'#94a3b8',marginBottom:4}}>👤 {dept.approver}</div>}
                    {dept.assets_received&&dept.assets_received.length>0&&<div style={{fontSize:8,color:'#10b981',marginBottom:4}}>📦 {dept.assets_received.join(', ')}</div>}
                    <div style={{fontSize:8,color:'#94a3b8',fontStyle:'italic',marginBottom:4}}>{sc.responsibility?.substring(0,60)}...</div>
                      {dept.status==='pending'?(
                        <button onClick={()=>clearDept(c.id,key)} style={{width:'100%',padding:'5px',borderRadius:6,border:'none',background:`${dc.color}15`,color:dc.color,fontSize:9,fontWeight:700,cursor:'pointer'}}>Mark Cleared</button>
                      ):(
                        <div style={{fontSize:8,color:'#10b981',fontWeight:600}}>✓ {dept.cleared_date}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Clearance',key:'view'},{icon:'📧',label:'Notify Pending Depts',key:'notify'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Exit Clearance" columns={['Employee','Position','LWD','IT Status','Finance Status','Facilities Status','HR Status','F&F Amount','F&F Frozen']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

// FILE: LeaveTypePage.jsx - Leave Type (Leave Management)
// Master control list: color-coded categories, doc-required toggle, probation
// eligibility, half-day support, Nepal LA2074 statutory minimums pre-loaded.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const LEAVE_TYPES = [
  { id:'lt1', name:'Home/Annual Leave', code:'HL', color:'#10b981', icon:'🏖',
    annual_entitlement:'1 day per 20 worked', is_paid:true, requires_doc:false, doc_threshold_days:null,
    probation_eligible:false, half_day_supported:true, max_carry_forward:90, statutory:true,
    impact_links:['Leave Balance Rule','Leave Policy'] },
  { id:'lt2', name:'Sick Leave', code:'SL', color:'#ef4444', icon:'🤒',
    annual_entitlement:'12 days (pro-rata)', is_paid:true, requires_doc:true, doc_threshold_days:3,
    probation_eligible:true, half_day_supported:true, max_carry_forward:45, statutory:true,
    impact_links:['Leave Balance Rule'] },
  { id:'lt3', name:'Maternity Leave', code:'ML', color:'#ec4899', icon:'🤰',
    annual_entitlement:'14 weeks (98 days)', is_paid:'Partial (60 days full)', requires_doc:true, doc_threshold_days:0,
    probation_eligible:true, half_day_supported:false, max_carry_forward:0, statutory:true,
    impact_links:[] },
  { id:'lt4', name:'Paternity Leave', code:'PL', color:'#3b82f6', icon:'👨‍👶',
    annual_entitlement:'15 days', is_paid:true, requires_doc:true, doc_threshold_days:0,
    probation_eligible:true, half_day_supported:false, max_carry_forward:0, statutory:true,
    impact_links:[] },
  { id:'lt5', name:'Mourning Leave (Kiriya)', code:'MR', color:'#64748b', icon:'🕯',
    annual_entitlement:'13 days', is_paid:true, requires_doc:false, doc_threshold_days:null,
    probation_eligible:true, half_day_supported:false, max_carry_forward:0, statutory:true,
    impact_links:[] },
  { id:'lt6', name:'Unpaid Leave', code:'UL', color:'#94a3b8', icon:'📄',
    annual_entitlement:'As approved', is_paid:false, requires_doc:false, doc_threshold_days:null,
    probation_eligible:true, half_day_supported:true, max_carry_forward:0, statutory:false,
    impact_links:[] },
  { id:'lt7', name:'Mental Health Day', code:'MH', color:'#06b6d4', icon:'🧘',
    annual_entitlement:'2 days (company benefit)', is_paid:true, requires_doc:false, doc_threshold_days:null,
    probation_eligible:false, half_day_supported:true, max_carry_forward:0, statutory:false,
    impact_links:[] },
]

export default function LeaveTypePage() {
  const [types, setTypes] = useState(LEAVE_TYPES)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState("")
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(""),3000) }
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = types.filter(t=>!search||t.name.toLowerCase().includes(search.toLowerCase()))
  const statutoryCount = types.filter(t=>t.statutory).length

  return (
    <div onClick={()=>setCtx(null)}>
      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}
      <PageHeader icon="🏷" title="Leave Type"
        breadcrumb="Workforce Operations > Leave Management > Leave Setup"
        gradient={G}
        stats={[
          {icon:'🏷',label:'Total Types',     value:types.length},
          {icon:'⚖',label:'Statutory',        value:statutoryCount},
          {icon:'🎁',label:'Discretionary',    value:types.length-statutoryCount},
          {icon:'📋',label:'Require Docs',     value:types.filter(t=>t.requires_doc).length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Leave Type"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal LA2074 Statutory Minimums (pre-loaded):</strong> Home Leave (1/20 days worked), Sick Leave (12 days, doc required after 3), Maternity (14wk/98 days, 60 paid), Paternity (15 days), Mourning/Kiriya (13 days). Discretionary types (Mental Health Day) are company benefits beyond the legal floor.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search leave types..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(t=>(
          <div key={t.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.name,...t}})}}
            style={{background:'#fff',border:`1.5px solid ${t.color}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${t.color}`}}>
            <div style={{padding:'16px 16px 10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <span style={{fontSize:24}}>{t.icon}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{t.name}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>Code: {t.code}</div>
                  </div>
                </div>
                {t.statutory&&<span style={{background:`${t.color}15`,color:t.color,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,flexShrink:0}}>⚖ Statutory</span>}
              </div>

              <div style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px',marginBottom:8,fontSize:10,color:'#374151'}}>
                <strong>{t.annual_entitlement}</strong>
              </div>

              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
                <span style={{background:t.is_paid===true?'#f0fdf4':t.is_paid===false?'#fef2f2':'#fffbeb',color:t.is_paid===true?'#15803d':t.is_paid===false?'#dc2626':'#b45309',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>
                  {t.is_paid===true?'✓ Paid':t.is_paid===false?'✗ Unpaid':t.is_paid}
                </span>
                {t.requires_doc&&<span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>📋 Doc after {t.doc_threshold_days}d</span>}
                {t.half_day_supported&&<span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>½ Half-Day OK</span>}
                {!t.probation_eligible&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>🚫 Post-Probation Only</span>}
              </div>

              {t.max_carry_forward>0&&<div style={{fontSize:9,color:'#94a3b8'}}>Max carry-forward: {t.max_carry_forward} days</div>}
            </div>
            <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 12px',display:'flex',gap:6}}>
              <button onClick={()=>notify('✏️ Opening rules editor...')} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:`${A}12`,color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>Edit Rules</button>
              <button onClick={()=>notify('📊 Loading leave usage data...')} style={{flex:1,padding:'7px',borderRadius:8,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,fontWeight:700,cursor:'pointer'}}>View Usage</button>
            </div>
          </div>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:580,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Leave Type</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Leave Type Name *</label>
                <input type="text" value={form.leaveTypeName||""} onChange={e=>setForm(p=>({...p,leaveTypeName:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Code</label>
                <input type="text" value={form.code||""} placeholder="e.g. HL, SL" onChange={e=>setForm(p=>({...p,code:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Annual Entitlement</label>
                <input type="text" value={form.annualEntitlement||""} onChange={e=>setForm(p=>({...p,annualEntitlement:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Color Tag</label>
                <select value={form.colorTag||"Green"} onChange={e=>setForm(p=>({...p,colorTag:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',boxSizing:'border-box'}}><option key="Green" value="Green">Green</option><option key="Red" value="Red">Red</option><option key="Blue" value="Blue">Blue</option><option key="Purple" value="Purple">Purple</option><option key="Pink" value="Pink">Pink</option><option key="Cyan" value="Cyan">Cyan</option><option key="Grey" value="Grey">Grey</option></select>
                </div>
              </div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap',margin:'10px 0'}}>
                <label style={{display:'flex',gap:6,alignItems:'center',fontSize:11,color:'#374151',cursor:'pointer'}}><input type="checkbox" defaultChecked style={{accentColor:A}}/> Paid</label>
                <label style={{display:'flex',gap:6,alignItems:'center',fontSize:11,color:'#374151',cursor:'pointer'}}><input type="checkbox" style={{accentColor:A}}/> Requires Medical Document</label>
                <label style={{display:'flex',gap:6,alignItems:'center',fontSize:11,color:'#374151',cursor:'pointer'}}><input type="checkbox" defaultChecked style={{accentColor:A}}/> Eligible During Probation</label>
                <label style={{display:'flex',gap:6,alignItems:'center',fontSize:11,color:'#374151',cursor:'pointer'}}><input type="checkbox" defaultChecked style={{accentColor:A}}/> Half-Day Supported</label>
              </div>
              <AIImpact color={A} lines={['Statutory types auto-validated against Nepal LA2074 minimums.','Custom/discretionary types layer on top without affecting compliance.','Color tag drives visual identification across calendar and balance views.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>{notify("Record created");setShowAdd(false);setForm({})}} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Leave Type</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Usage',key:'view'},{icon:'✏',label:'Edit Rules',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Leave Types" columns={['Name','Code','Annual Entitlement','Is Paid','Requires Doc','Probation Eligible','Half-Day Supported','Max Carry Forward','Statutory']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )

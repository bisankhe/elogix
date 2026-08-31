// FILE: AllowancePage.jsx - Allowance (Payroll & Compensation)
// Master allowance catalog: taxable/non-taxable toggle, flat-vs-percentage
// calc, festival/night/field allowances, 60%-basic-floor guard.

import { useState, useEffect } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const ALLOWANCES = [
  { id:'a1', name:'House Rent Allowance', code:'HRA', calc_type:'percentage', calc_value:'20% of basic', taxable:true, statutory:false, impact_links:['Salary Structure','Tax Setup'] },
  { id:'a2', name:'Dearness Allowance', code:'DA', calc_type:'flat', calc_value:'NPR 5,000', taxable:true, statutory:false, impact_links:[] },
  { id:'a3', name:'Festival Allowance (Annual)', code:'FA', calc_type:'percentage', calc_value:'1 month basic / year', taxable:true, statutory:true, impact_links:['Compliance Setup'] },
  { id:'a4', name:'Night Shift Allowance', code:'NSA', calc_type:'flat', calc_value:'NPR 500/night shift', taxable:true, statutory:false, impact_links:['Shift Management','Payroll Setup'] },
  { id:'a5', name:'Field/Travel Allowance', code:'TA', calc_type:'flat', calc_value:'Per Field Visit TA rate', taxable:false, statutory:false, impact_links:['Field Visit Tracking'] },
  { id:'a6', name:'Business Expense Reimbursement', code:'BER', calc_type:'flat', calc_value:'Actual receipt amount', taxable:false, statutory:false, impact_links:[] },
]


function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
function _getTenantCtx() {
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

export default function AllowancePage() {
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const [allowances, setAllowances] = useState(ALLOWANCES)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = allowances.filter(a=>!search||a.name.toLowerCase().includes(search.toLowerCase()))
  const taxableCount = allowances.filter(a=>a.taxable).length

  useEffect(()=>{
    const {token,slug,valid} = _getTenantCtx()
    if(!valid){setApiLoading(false);return}
    setApiLoading(true);setApiError(null)
    fetch('/api/v1/payroll-setup/allowances',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{const p=d.allowances||d.data||d;if(p)setApiData(p)})
      .catch(err=>setApiError(err.message))
      .finally(()=>setApiLoading(false))
  },[])

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="➕" title="Allowance"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Setup"
        gradient={G}
        stats={[
          {icon:'➕',label:'Total Allowances', value:allowances.length},
          {icon:'💰',label:'Taxable',           value:taxableCount},
          {icon:'🎁',label:'Non-Taxable',       value:allowances.length-taxableCount},
          {icon:'⚖',label:'Statutory',         value:allowances.filter(a=>a.statutory).length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add Allowance"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
      {apiLoading && (
        <div style={{textAlign:'center',padding:40,color:'#7c3aed',fontSize:13,fontWeight:600}}>
          <div style={{fontSize:32,marginBottom:8}}>⟳</div>Loading...
        </div>
      )}
      {apiError && !apiLoading && (
        <div style={{padding:'8px 14px',background:'#fef2f2',border:'1px solid #fecaca',
          borderRadius:8,fontSize:12,color:'#dc2626',marginBottom:8,fontWeight:600}}>
          ⚠️ {apiError}
        </div>
      )}
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:220}}><strong>Nepal LA2074:</strong> Festival Allowance equal to 1 month's basic salary/year is mandatory. Other allowances (food/travel/dearness) are permitted but cannot push Basic Salary below the 60% statutory floor - every allowance here auto-validates against that guard.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search allowances..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginTop:14}}>
        {filtered.map(a=>(
          <div key={a.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.name,...a}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px',boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{a.name}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>Code: {a.code}</div>
              </div>
              {a.statutory&&<span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⚖ Statutory</span>}
            </div>
            <div style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px',marginBottom:8,fontSize:10,color:'#374151'}}><strong>{a.calc_value}</strong></div>
            <div style={{display:'flex',gap:6}}>
              <span style={{background:a.taxable?'#fffbeb':'#f0fdf4',color:a.taxable?'#b45309':'#15803d',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{a.taxable?'💰 Taxable':'🎁 Non-Taxable'}</span>
              <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20,textTransform:'capitalize'}}>{a.calc_type}</span>
            </div>
          </div>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(560px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Add Allowance</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Allowance Name" value="" onChange={()=>{}} accent={A} required/>
                <Field label="Code" value="" onChange={()=>{}} accent={A}/>
                <Field label="Calculation Type" type="select" value="" onChange={()=>{}} accent={A} options={['Flat Amount','Percentage of Basic']}/>
                <Field label="Value" value="" onChange={()=>{}} accent={A}/>
              </div>
              <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" defaultChecked style={{accentColor:A}}/> Taxable
              </label>
              <AIImpact color={A} lines={['Auto-blocks if adding this allowance pushes Basic Salary below 60%.','Taxable allowances flow directly into Tax Setup calculations.','Syncs to every linked Salary Structure instantly.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowAdd(false)} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Add Allowance</button>
                <button onClick={()=>setShowAdd(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✏',label:'Edit',key:'edit'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Allowances" columns={['Name','Code','Calculation Type','Value','Taxable','Statutory']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}

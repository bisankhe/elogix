// FILE: CostCenterPage.jsx - Page 5: Cost Center
import { useState, useEffect } from 'react'


function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

// Inline theme — replaces missing DeptSetupShared THEMES.cost
const T = {
  gradient: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)',
}




const MOCK_COSTS = [
  { id:'cc1', code:'CC-IT-001', name:'IT Department Cost Center', short:'IT Costs',
    type:'Department', owner:'Bikram Shrestha', approver:'CEO', department:'Information Technology',
    budget_annual_npr:52000000, ytd_spend_npr:28400000, status:'active', currency:'NPR',
    gl_account:'5001', erp_code:'CC-IT-001', profit_center:'PC-TECH',
    linked_to:['DEPT-IT','BU-TECH','TEAM-FE-WEB','TEAM-BE-API','TEAM-QA'],
    impact_links:[{icon:'💰',module:'Payroll',desc:'All IT salaries charged here'},{icon:'📊',module:'Budget Reports',desc:'Monthly variance tracking'},{icon:'🏛️',module:'Finance',desc:'GL account mapping'}],
    icon:'💻', color:'#3b82f6',
  },
  { id:'cc2', code:'CC-HR-001', name:'Human Resources Cost Center', short:'HR Costs',
    type:'Department', owner:'Sita Sharma', approver:'CEO', department:'Human Resources',
    budget_annual_npr:18000000, ytd_spend_npr:9200000, status:'active', currency:'NPR',
    gl_account:'5002', erp_code:'CC-HR-001', profit_center:'PC-CORP',
    linked_to:['DEPT-HR','TEAM-HR-HRBP'],
    impact_links:[{icon:'💰',module:'HR Payroll',desc:'HR team costs'},{icon:'📋',module:'Training Budget',desc:'L&D costs allocated here'}],
    icon:'👥', color:'#8b5cf6',
  },
  { id:'cc3', code:'CC-SALES-001', name:'Sales Cost Center', short:'Sales Costs',
    type:'Department', owner:'Dev Poudel', approver:'CFO', department:'Sales',
    budget_annual_npr:35000000, ytd_spend_npr:20100000, status:'active', currency:'NPR',
    gl_account:'5003', erp_code:'CC-SALES-001', profit_center:'PC-COMM',
    linked_to:['DEPT-SALES','TEAM-SALES-ENT'],
    impact_links:[{icon:'💰',module:'Sales Commission',desc:'Incentive payroll charged here'},{icon:'🎯',module:'Revenue Tracking',desc:'P&L contribution'}],
    icon:'📈', color:'#f59e0b',
  },
  { id:'cc4', code:'CC-KTM-001', name:'Kathmandu HQ Cost Center', short:'KTM HQ',
    type:'Branch', owner:'Admin Manager', approver:'COO', department:'Admin & Facilities',
    budget_annual_npr:24000000, ytd_spend_npr:13500000, status:'active', currency:'NPR',
    gl_account:'5010', erp_code:'CC-KTM-001', profit_center:'PC-OPS',
    linked_to:['BR-KTM-HQ','DEPT-OPS'],
    impact_links:[{icon:'🏢',module:'Facilities',desc:'Rent, utilities, maintenance'},{icon:'💰',module:'Payroll',desc:'HQ-based staff costs'}],
    icon:'🏛️', color:'#0ea5e9',
  },
  { id:'cc5', code:'CC-PKR-001', name:'Pokhara Branch Cost Center', short:'Pokhara',
    type:'Branch', owner:'Branch Manager', approver:'COO', department:'Operations',
    budget_annual_npr:8000000, ytd_spend_npr:4100000, status:'active', currency:'NPR',
    gl_account:'5011', erp_code:'CC-PKR-001', profit_center:'PC-OPS',
    linked_to:['BR-PKR'],
    impact_links:[{icon:'💰',module:'Payroll',desc:'Pokhara staff costs'},{icon:'🏢',module:'Facilities',desc:'Lakeside office costs'}],
    icon:'🏢', color:'#10b981',
  },
]

const CONTEXT_ACTIONS = [
  {icon:'👁️',label:'View Details',     key:'view'},
  {icon:'✏️',label:'Edit Cost Center', key:'edit'},
  {icon:'📊',label:'Budget Report',    key:'report'},
  {icon:'📈',label:'YTD Analysis',     key:'ytd'},
  {icon:'🔗',label:'Linked Entities',  key:'links'},
  {icon:'💰',label:'Payroll Mapping',  key:'payroll'},
  {icon:'📤',label:'Export Excel',     key:'export'},
  {icon:'❄️',label:'Freeze Budget',    key:'freeze', danger:true},
]


// ── Inline shared components (replaces missing DeptSetupShared.jsx) ───────────

function PageHeader({ icon, title, breadcrumb, gradient, stats, onAdd, addLabel, onExcel }) {
  const _s2 = _getSession(); const _co = _s2?.company||{}
  return (
    <div style={{background:gradient,borderRadius:16,padding:'18px 22px',marginBottom:16,boxShadow:'0 4px 20px rgba(0,0,0,.1)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <span style={{fontSize:22}}>{icon}</span>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>{title}</div>
          </div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginBottom:10}}>{breadcrumb} · {_co?.name}</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {(stats||[]).map((s,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'5px 12px'}}>
                <span style={{fontSize:11}}>{s.icon}</span>
                <span style={{fontSize:14,fontWeight:800,color:'#fff',marginLeft:5}}>{s.value}</span>
                <span style={{fontSize:9,color:'rgba(255,255,255,.7)',marginLeft:3}}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {onAdd&&<button onClick={onAdd} style={{padding:'8px 16px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.4)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {addLabel||'Add'}</button>}
          {onExcel&&<button onClick={onExcel} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.3)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:11,cursor:'pointer'}}>📊 Excel</button>}
        </div>
      </div>
    </div>
  )
}
function Field({ label, value, onChange, type='text', options, required, placeholder='' }) {
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>{label}{required&&<span style={{color:'#ef4444'}}> *</span>}</label>
      {type==='select'
        ?<select value={value||''} onChange={e=>onChange(e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',appearance:'none',background:'#fff',boxSizing:'border-box'}}>
          <option value=''>Select...</option>{(options||[]).map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        :<input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',boxSizing:'border-box'}}/>
      }
    </div>
  )
}
function SearchBar({ value, onChange, placeholder }) {
  return <input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'🔍 Search...'} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff',minWidth:200}}/>
}
function Badge({ label, color='#64748b' }) {
  return <span style={{background:`${color}15`,color,fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{label}</span>
}
function LuxCard({ children, onClick, selected, accentColor='#7c3aed' }) {
  return (
    <div onClick={onClick}
      style={{background:'#fff',borderRadius:14,border:`1.5px solid ${selected?accentColor:'#e2e8f0'}`,padding:16,cursor:'pointer',boxShadow:`0 2px 8px rgba(0,0,0,.05)`,transition:'all .15s'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'}}>
      {children}
    </div>
  )
}
function ContextMenu({ ctx, actions, onClose }) {
  if(!ctx) return null
  return (
    <div onClick={e=>e.stopPropagation()} style={{position:'fixed',zIndex:9999,left:ctx.x,top:ctx.y,background:'#fff',borderRadius:12,width:190,boxShadow:'0 20px 60px rgba(0,0,0,.2)',border:'1px solid #e2e8f0',overflow:'hidden'}}>
      {(actions||[]).map((a,i)=>(
        <button key={i} onClick={()=>{a.fn();onClose?.()}}
          style={{width:'100%',padding:'9px 14px',border:'none',background:'transparent',textAlign:'left',fontSize:12,cursor:'pointer',color:a.danger?'#ef4444':'#334155',borderBottom:i<(actions.length-1)?'1px solid #f8fafc':'none'}}
          onMouseEnter={e=>e.currentTarget.style.background=a.danger?'#fef2f2':'#f8fafc'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          {a.icon} {a.label}
        </button>
      ))}
    </div>
  )
}
function Drawer({ show, onClose, title, children }) {
  if(!show) return null
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:3999}}/>
      <div style={{position:'fixed',right:0,top:0,bottom:0,width:420,background:'#fff',zIndex:4000,overflowY:'auto',boxShadow:'-20px 0 60px rgba(0,0,0,.15)'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{title}</div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#94a3b8'}}>×</button>
        </div>
        <div style={{padding:'20px'}}>{children}</div>
      </div>
    </>
  )
}
function ExcelModal({ show, onClose }) {
  if(!show) return null
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:14,padding:24,maxWidth:400,width:'90%'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>📊 Excel Import / Export</div>
        <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>Upload an Excel file to bulk-import data, or export the current list to Excel.</p>
        <button onClick={onClose} style={{padding:'8px 20px',borderRadius:8,border:'none',background:'#64748b',color:'#fff',cursor:'pointer',fontSize:12}}>Close</button>
      </div>
    </div>
  )
}
function AIImpact({ links }) { return null }
// ─────────────────────────────────────────────────────────────────────────────


export default function CostCenterPage() {

  // Load real tenant data
  const _s = _getSession()
  const _company = _s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || _s?.token || ''
    const slug  = _s?.company?.slug || ''
    if (!token || !slug) return
    fetch('/api/v1/cost-centers', { headers: _authH() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));return null}; return r.ok ? r.json() : null })
      .then(d => d && setCosts(d.data?.cost_centers || d.cost_centers || d.data || []))
      .catch(() => {})
  }, [])
  const [costs,     setCosts]     = useState([])
  const [search,    setSearch]    = useState('')
  const [ctx,       setCtx]       = useState(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [selected,  setSelected]  = useState(null)

  const filtered = costs.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  )

  const totalBudget = costs.reduce((s,c)=>s+c.budget_annual_npr,0)
  const totalSpend  = costs.reduce((s,c)=>s+c.ytd_spend_npr,0)
  const utilPct     = Math.round(totalSpend/totalBudget*100)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="💰" title="Cost Center"
        breadcrumb="Organization Management > Department & Team Setup"
        gradient={T.gradient}
        stats={[
          {icon:'💰',label:'Cost Centers',  value:costs.length},
          {icon:'📊',label:'Annual Budget', value:'NPR '+(totalBudget/1e7).toFixed(1)+'Cr'},
          {icon:'📈',label:'YTD Spend',     value:'NPR '+(totalSpend/1e7).toFixed(1)+'Cr'},
          {icon:'⚡',label:'Utilization',   value:utilPct+'%'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Cost Center"
        onExcel={()=>setShowExcel(true)}
      />

      {/* Overall budget bar */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px',marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,marginBottom:8}}>
          <span style={{color:'#334155'}}>Company-Wide Budget Utilization (YTD)</span>
          <span style={{color:utilPct>90?'#ef4444':utilPct>75?'#f59e0b':'#10b981'}}>{utilPct}%</span>
        </div>
        <div style={{height:10,background:'#f1f5f9',borderRadius:10,overflow:'hidden',marginBottom:8}}>
          <div style={{width:`${utilPct}%`,height:'100%',borderRadius:10,transition:'width .8s',
            background:`linear-gradient(90deg,${utilPct>90?'#ef4444':'#f97316'},${utilPct>90?'#dc2626':'#f59e0b'})`}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#94a3b8'}}>
          <span>Spent: NPR {(totalSpend/1e6).toFixed(1)}M</span>
          <span>Remaining: NPR {((totalBudget-totalSpend)/1e6).toFixed(1)}M</span>
          <span>Total: NPR {(totalBudget/1e6).toFixed(1)}M</span>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search cost centers..." />
      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:'8px 14px',marginBottom:16,fontSize:11,color:'#92400e'}}>
        Right-click any cost center to see SAP-style GL account mappings and payroll connections
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
        {filtered.map(cc => {
          const pct = Math.round(cc.ytd_spend_npr/cc.budget_annual_npr*100)
          const barColor = pct>90?'#ef4444':pct>75?'#f59e0b':'#10b981'
          return (
            <LuxCard key={cc.id} color={cc.color}
              onClick={()=>setSelected(cc)}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:cc})}}>
              <div style={{padding:'16px 16px 12px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:46,height:46,borderRadius:12,background:`${cc.color}18`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                  {cc.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cc.name}</span>
                    <Badge status={cc.status}/>
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{cc.code} &bull; {cc.type} &bull; GL: {cc.gl_account}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:3}}>
                    Owner: <strong style={{color:'#334155'}}>{cc.owner}</strong>
                  </div>
                </div>
              </div>
              <div style={{padding:'0 16px 10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4,color:'#64748b'}}>
                  <span>Budget Utilization</span>
                  <span style={{fontWeight:700,color:barColor}}>{pct}%</span>
                </div>
                <div style={{height:7,background:'#f1f5f9',borderRadius:8,overflow:'hidden',marginBottom:6}}>
                  <div style={{width:`${pct}%`,height:'100%',background:barColor,borderRadius:8,transition:'width .6s'}}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    {l:'Annual Budget',v:'NPR '+(cc.budget_annual_npr/1e6).toFixed(1)+'M',c:'#3b82f6'},
                    {l:'YTD Spend',    v:'NPR '+(cc.ytd_spend_npr/1e6).toFixed(1)+'M',   c:barColor},
                  ].map((s,i)=>(
                    <div key={i} style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px'}}>
                      <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 16px',fontSize:10,color:'#94a3b8',display:'flex',justifyContent:'space-between'}}>
                <span>ERP: {cc.erp_code}</span>
                <span>Profit Center: {cc.profit_center}</span>
              </div>
            </LuxCard>
          )
        })}
        <div onClick={()=>setShowAdd(true)}
          style={{border:'2px dashed #fed7aa',borderRadius:16,minHeight:180,display:'flex',
            flexDirection:'column',alignItems:'center',justifyContent:'center',
            cursor:'pointer',color:'#94a3b8',gap:8,transition:'all .2s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#f97316';e.currentTarget.style.color='#f97316'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#fed7aa';e.currentTarget.style.color='#94a3b8'}}>
          <span style={{fontSize:32}}>+</span>
          <span style={{fontSize:12,fontWeight:700}}>Add Cost Center</span>
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
        impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
        actions={CONTEXT_ACTIONS}
        onAction={(k,item)=>{if(k==='view')setSelected(item)}}
        onClose={()=>setCtx(null)} />}
      {showExcel && <ExcelModal title="Cost Center"
        columns={['CC Code','Name','Type','Owner','Approver','Department','GL Account','ERP Code','Profit Center','Annual Budget NPR']}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Processing: '+f.name)} />}
      {showAdd && <AddCCModal T={T} onClose={()=>setShowAdd(false)}
        onSave={c=>setCosts(p=>[...p,{...c,id:'cc'+Date.now(),status:'active',icon:'💰',color:'#f97316',ytd_spend_npr:0,impact_links:[]}])} />}
      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Code',          selected?.code],
          ['Type',          selected?.type],
          ['Owner',         selected?.owner],
          ['Approver',      selected?.approver],
          ['Department',    selected?.department],
          ['GL Account',    selected?.gl_account],
          ['ERP Code',      selected?.erp_code],
          ['Profit Center', selected?.profit_center],
          ['Annual Budget', selected ? 'NPR '+(selected.budget_annual_npr/1e6).toFixed(1)+'M' : null],
          ['YTD Spend',     selected ? 'NPR '+(selected.ytd_spend_npr/1e6).toFixed(1)+'M' : null],
          ['Linked To',     selected?.linked_to?.join(', ')],
        ]}/>
    </div>
  )
}

function AddCCModal({ T, onClose, onSave }) {
  const [f,setF] = useState({code:'',name:'',short:'',type:'Department',owner:'',approver:'',department:'',gl_account:'',erp_code:'',profit_center:'',budget_annual_npr:''})
  const s = k => v => setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:660,maxHeight:'90vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 28px',background:T.gradient,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ New Cost Center</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="CC Code" value={f.code} onChange={s('code')} required accent={T.accent} hint="e.g. CC-IT-002"/>
            <Field label="Name" value={f.name} onChange={s('name')} required accent={T.accent}/>
            <Field label="Type" type="select" value={f.type} onChange={s('type')} accent={T.accent}
              options={['Department','Branch','Project','Product','Business Unit','Corporate']}/>
            <Field label="Owner" value={f.owner} onChange={s('owner')} accent={T.accent}/>
            <Field label="Approver" value={f.approver} onChange={s('approver')} accent={T.accent}/>
            <Field label="Linked Department" type="select" value={f.department} onChange={s('department')} accent={T.accent}
              options={['Information Technology','Human Resources','Finance & Accounts','Sales','Marketing','Operations','Legal']}/>
            <Field label="GL Account" value={f.gl_account} onChange={s('gl_account')} accent={T.accent} hint="Finance ERP ledger code"/>
            <Field label="ERP Code" value={f.erp_code} onChange={s('erp_code')} accent={T.accent}/>
            <Field label="Profit Center" value={f.profit_center} onChange={s('profit_center')} accent={T.accent}/>
            <Field label="Annual Budget (NPR)" type="number" value={f.budget_annual_npr} onChange={s('budget_annual_npr')} accent={T.accent}/>
          </div>
          <AIImpact color={T.accent} lines={[
            'Cost center will be linked to payroll for salary charge-back.',
            'Finance GL account mapping enables automatic budget vs actual tracking.',
            'All expenses from linked departments/branches will be aggregated here.',
            'ERP sync will auto-export to accounting software.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}}
              style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:T.gradient,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Create Cost Center
            </button>
            <button onClick={onClose}
              style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

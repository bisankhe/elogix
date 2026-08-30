// FILE: DeptSetupPage.jsx - Page 2: Department Setup
import { useState } from 'react'
import {
  THEMES, Field, ContextMenu, ExcelModal, PageHeader,
  MiniStat, AIImpact, Drawer, SearchBar, Badge, LuxCard
} from './DeptSetupShared.jsx'

const T = THEMES.dept

const MOCK_DEPTS = [
  { id:'d1', code:'DEPT-IT',   name:'Information Technology', short:'IT Dept',
    type:'Technical', bu:'Technology Division', head:'Bikram Shrestha',
    hrbp:'Priya Rai', employees:186, open_positions:4, budget_npr:12000000,
    cost_center:'CC-IT-001', work_location:'Kathmandu HQ', status:'active',
    icon:'💻', color:'#3b82f6', description:'Software development, infrastructure, and IT support.',
    impact_links:[
      {icon:'💰',module:'Payroll',       desc:'Salary processed per department group'},
      {icon:'👥',module:'Headcount Plan',desc:'Budgeted vs actual employee count'},
      {icon:'🎯',module:'OKRs / Goals',  desc:'Dept-level KPI tracking'},
      {icon:'📅',module:'Leave Management',desc:'Dept coverage rules'},
      {icon:'🔐',module:'IT Access',     desc:'System permissions per dept'},
      {icon:'📋',module:'HR Policies',   desc:'Policy acknowledgment tracking'},
    ],
  },
  { id:'d2', code:'DEPT-HR',  name:'Human Resources', short:'HR Dept',
    type:'Support', bu:'Corporate Functions', head:'Sita Sharma',
    hrbp:'Self (HRBP)', employees:28, open_positions:2, budget_npr:3500000,
    cost_center:'CC-HR-001', work_location:'Kathmandu HQ', status:'active',
    icon:'👥', color:'#8b5cf6', description:'HR operations, payroll, compliance, talent acquisition.',
    impact_links:[
      {icon:'💰',module:'Payroll',         desc:'HR dept salary payroll'},
      {icon:'📋',module:'Policy Management',desc:'HR owns all policy updates'},
      {icon:'🎯',module:'Recruitment',     desc:'All JD approvals routed to HR Director'},
      {icon:'📊',module:'Reports',         desc:'HR generates company-wide reports'},
    ],
  },
  { id:'d3', code:'DEPT-FIN', name:'Finance & Accounts', short:'Finance',
    type:'Support', bu:'Corporate Functions', head:'Meena Pradhan',
    hrbp:'Priya Rai', employees:22, open_positions:1, budget_npr:2800000,
    cost_center:'CC-FIN-001', work_location:'Kathmandu HQ', status:'active',
    icon:'💰', color:'#10b981', description:'Financial management, payroll processing, compliance.',
    impact_links:[
      {icon:'💰',module:'Payroll Processing',desc:'Finance approves all payroll runs'},
      {icon:'📊',module:'Budget Control',   desc:'Cost center budget holder'},
      {icon:'⚖️',module:'Tax & Compliance',desc:'IRD, SSF, PF filing'},
    ],
  },
  { id:'d4', code:'DEPT-SALES',name:'Sales', short:'Sales',
    type:'Revenue', bu:'Commercial Division', head:'Dev Poudel',
    hrbp:'Anita Karki', employees:65, open_positions:6, budget_npr:7000000,
    cost_center:'CC-SALES-001', work_location:'Hybrid', status:'active',
    icon:'📈', color:'#f59e0b', description:'Enterprise and SMB sales across Nepal and India.',
    impact_links:[
      {icon:'💰',module:'Commission Payroll',desc:'Sales incentives in payroll'},
      {icon:'🎯',module:'Performance',       desc:'Sales KPI in performance review'},
      {icon:'📋',module:'CRM Integration',   desc:'Lead-to-deal tracking'},
    ],
  },
  { id:'d5', code:'DEPT-MKT', name:'Marketing', short:'Marketing',
    type:'Revenue', bu:'Commercial Division', head:'Gita Lama',
    hrbp:'Anita Karki', employees:18, open_positions:2, budget_npr:4500000,
    cost_center:'CC-MKT-001', work_location:'Hybrid', status:'active',
    icon:'📣', color:'#ec4899', description:'Brand, digital marketing, content, demand generation.',
    impact_links:[
      {icon:'💰',module:'Payroll',   desc:'Marketing dept payroll'},
      {icon:'📊',module:'Budget',    desc:'Campaign budget tracking'},
    ],
  },
  { id:'d6', code:'DEPT-LEGAL',name:'Legal', short:'Legal',
    type:'Support', bu:'Corporate Functions', head:'Ram Bista',
    hrbp:'Priya Rai', employees:8, open_positions:1, budget_npr:2000000,
    cost_center:'CC-LEGAL-001', work_location:'Kathmandu HQ', status:'active',
    icon:'⚖️', color:'#0ea5e9', description:'Corporate legal, contracts, regulatory compliance.',
    impact_links:[
      {icon:'📋',module:'Contract Management',desc:'All contracts through Legal'},
      {icon:'⚖️',module:'Compliance',        desc:'Labour law, OCR, IRD compliance'},
    ],
  },
]

const CONTEXT_ACTIONS = [
  {icon:'👁️',label:'View Details',      key:'view'},
  {icon:'✏️',label:'Edit Department',   key:'edit'},
  {icon:'👥',label:'View Employees',    key:'employees'},
  {icon:'🎯',label:'View OKRs',         key:'okrs'},
  {icon:'💰',label:'Budget Details',    key:'budget'},
  {icon:'🔗',label:'Linked Modules',    key:'links'},
  {icon:'📊',label:'Dept Dashboard',   key:'dashboard'},
  {icon:'📤',label:'Export to Excel',  key:'export'},
  {icon:'🗑️',label:'Deactivate',       key:'deactivate', danger:true},
]

const EXCEL_COLS = ['Dept Code','Dept Name','Short Name','Type','Business Unit',
  'Head','HRBP','Cost Center','Work Location','Budget (NPR)','Status']

export default function DeptSetupPage() {
  const [depts,      setDepts]      = useState(MOCK_DEPTS)
  const [search,     setSearch]     = useState('')
  const [ctx,        setCtx]        = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [showExcel,  setShowExcel]  = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [viewMode,   setViewMode]   = useState('cards')

  const filtered = depts.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div onClick={() => setCtx(null)}>
      <PageHeader
        icon="🏛️" title="Department Setup"
        breadcrumb="Organization Management > Department & Team Setup"
        gradient={T.gradient}
        stats={[
          {icon:'🏛️', label:'Departments',  value:depts.length},
          {icon:'👥', label:'Employees',    value:depts.reduce((s,d)=>s+d.employees,0).toLocaleString()},
          {icon:'📋', label:'Open Positions',value:depts.reduce((s,d)=>s+d.open_positions,0)},
          {icon:'💰', label:'Total Budget', value:'NPR '+(depts.reduce((s,d)=>s+d.budget_npr,0)/1e6).toFixed(0)+'M'},
        ]}
        onAdd={() => setShowAdd(true)} addLabel="New Department"
        onExcel={() => setShowExcel(true)}
      />

      <SearchBar value={search} onChange={setSearch}
        placeholder="Search departments by name or code..."
        extra={
          <div style={{display:'flex',gap:4,background:'#f1f5f9',borderRadius:10,padding:3}}>
            {['cards','table'].map(m => (
              <button key={m} onClick={()=>setViewMode(m)}
                style={{padding:'6px 14px',borderRadius:8,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',
                  background:viewMode===m?'#fff':'transparent',color:viewMode===m?'#0f172a':'#64748b',
                  boxShadow:viewMode===m?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
                {m==='cards'?'Cards':'Table'}
              </button>
            ))}
          </div>
        }
      />

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:10,
        padding:'8px 14px',marginBottom:16,fontSize:11,color:'#3730a3'}}>
        Right-click any department to see SAP-style impact analysis and linked module connections
      </div>

      {viewMode === 'cards' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
          {filtered.map(dept => (
            <LuxCard key={dept.id} color={dept.color}
              onClick={() => setSelected(dept)}
              onContextMenu={e => {e.preventDefault(); setCtx({x:e.clientX,y:e.clientY,item:dept})}}>
              <div style={{padding:'18px 18px 12px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:48,height:48,borderRadius:14,background:`${dept.color}18`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                  {dept.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a',
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{dept.name}</span>
                    <Badge status={dept.status}/>
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{dept.code} &bull; {dept.type} &bull; {dept.bu}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:4}}>
                    Head: <strong style={{color:'#334155'}}>{dept.head}</strong>
                    &nbsp;&bull; HRBP: <strong style={{color:'#6366f1'}}>{dept.hrbp}</strong>
                  </div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',
                borderTop:'1px solid #f1f5f9',padding:'10px 18px',gap:8}}>
                {[
                  {l:'Employees',   v:dept.employees,          c:dept.color},
                  {l:'Open Roles',  v:dept.open_positions,     c:'#f59e0b'},
                  {l:'Budget',      v:'NPR '+(dept.budget_npr/1e6).toFixed(1)+'M', c:'#10b981'},
                ].map((s,i)=>(
                  <div key={i} style={{textAlign:'center'}}>
                    <div style={{fontSize:15,fontWeight:900,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:9,color:'#94a3b8',fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:'8px 18px 12px',display:'flex',justifyContent:'space-between',
                alignItems:'center'}}>
                <span style={{fontSize:10,color:'#94a3b8'}}>{dept.work_location}</span>
                <span style={{fontSize:9,color:'#94a3b8'}}>Right-click for options</span>
              </div>
            </LuxCard>
          ))}
          <div onClick={()=>setShowAdd(true)}
            style={{border:'2px dashed #c7d2fe',borderRadius:16,minHeight:180,display:'flex',
              flexDirection:'column',alignItems:'center',justifyContent:'center',
              cursor:'pointer',color:'#94a3b8',gap:8,transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#6366f1';e.currentTarget.style.color='#6366f1'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#c7d2fe';e.currentTarget.style.color='#94a3b8'}}>
            <span style={{fontSize:32}}>+</span>
            <span style={{fontSize:12,fontWeight:700}}>Add Department</span>
          </div>
        </div>
      )}

      {viewMode === 'table' && (
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'linear-gradient(135deg,#eef2ff,#f5f3ff)'}}>
                {['Icon','Code','Department','Type','Business Unit','Head','Employees','Budget','Status'].map(h=>(
                  <th key={h} style={{padding:'12px 14px',textAlign:'left',fontSize:10,fontWeight:700,
                    color:'#6366f1',borderBottom:'2px solid #e0e7ff'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d,i)=>(
                <tr key={d.id}
                  onClick={()=>setSelected(d)}
                  onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:d})}}
                  style={{borderBottom:'1px solid #f8fafc',cursor:'pointer'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#eef2ff'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <td style={{padding:'10px 14px',fontSize:18}}>{d.icon}</td>
                  <td style={{padding:'10px 14px',fontWeight:700,color:'#6366f1'}}>{d.code}</td>
                  <td style={{padding:'10px 14px',fontWeight:600,color:'#0f172a'}}>{d.name}</td>
                  <td style={{padding:'10px 14px',color:'#64748b'}}>{d.type}</td>
                  <td style={{padding:'10px 14px',color:'#64748b'}}>{d.bu}</td>
                  <td style={{padding:'10px 14px',color:'#334155'}}>{d.head}</td>
                  <td style={{padding:'10px 14px',fontWeight:700}}>{d.employees}</td>
                  <td style={{padding:'10px 14px',color:'#10b981',fontWeight:700}}>NPR {(d.budget_npr/1e6).toFixed(1)}M</td>
                  <td style={{padding:'10px 14px'}}><Badge status={d.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
          impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
          actions={CONTEXT_ACTIONS}
          onAction={(k,item)=>{ if(k==='view') setSelected(item) }}
          onClose={()=>setCtx(null)} />
      )}

      {showExcel && (
        <ExcelModal title="Department Setup" columns={EXCEL_COLS}
          onClose={()=>setShowExcel(false)} onImport={f=>alert('Processing: '+f.name)} />
      )}

      {showAdd && <AddDeptModal T={T} onClose={()=>setShowAdd(false)}
        onSave={d=>setDepts(p=>[...p,{...d,id:'d'+Date.now(),status:'active',employees:0,open_positions:0,icon:'🏢',color:'#6366f1',impact_links:[]}])} />}

      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Code',          selected?.code],
          ['Type',          selected?.type],
          ['Business Unit', selected?.bu],
          ['Head',          selected?.head],
          ['HRBP',          selected?.hrbp],
          ['Employees',     selected?.employees],
          ['Open Positions',selected?.open_positions],
          ['Budget',        selected ? 'NPR '+(selected.budget_npr/1e6).toFixed(1)+'M' : null],
          ['Cost Center',   selected?.cost_center],
          ['Work Location', selected?.work_location],
        ]}>
        {selected?.description && (
          <div style={{padding:'10px 0',borderBottom:'1px solid #f8fafc',fontSize:12,color:'#475569'}}>
            {selected.description}
          </div>
        )}
      </Drawer>
    </div>
  )
}

function AddDeptModal({ T, onClose, onSave }) {
  const [f, setF] = useState({code:'',name:'',short:'',type:'Technical',bu:'',head:'',hrbp:'',cost_center:'',work_location:'Kathmandu HQ',budget_npr:'',description:''})
  const s = k => v => setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'92vh',overflow:'auto',
        boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 28px',background:T.gradient,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ New Department</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:2}}>All fields support voice input via the mic button</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Dept Code" value={f.code} onChange={s('code')} required accent={T.accent}/>
            <Field label="Department Name" value={f.name} onChange={s('name')} required accent={T.accent}/>
            <Field label="Short Name" value={f.short} onChange={s('short')} accent={T.accent}/>
            <Field label="Type" type="select" value={f.type} onChange={s('type')} accent={T.accent}
              options={['Technical','Support','Revenue','Corporate','Operations','Compliance']}/>
            <Field label="Business Unit" type="select" value={f.bu} onChange={s('bu')} accent={T.accent}
              options={['Technology Division','Commercial Division','Operations Division','Corporate Functions']}/>
            <Field label="Head / Manager" value={f.head} onChange={s('head')} accent={T.accent}/>
            <Field label="HRBP Assigned" value={f.hrbp} onChange={s('hrbp')} accent={T.accent}/>
            <Field label="Cost Center" value={f.cost_center} onChange={s('cost_center')} accent={T.accent}/>
            <Field label="Work Location" type="select" value={f.work_location} onChange={s('work_location')} accent={T.accent}
              options={['Kathmandu HQ','Pokhara Branch','Biratnagar Branch','Delhi India','Remote','Hybrid']}/>
            <Field label="Annual Budget (NPR)" type="number" value={f.budget_npr} onChange={s('budget_npr')} accent={T.accent}/>
          </div>
          <Field label="Description" type="textarea" value={f.description} onChange={s('description')} accent={T.accent}/>
          <AIImpact color={T.accent} lines={[
            'Creating a department links to: Payroll grouping, OKR hierarchy, Leave policy rules.',
            'HRBP assignment routes all HR requests from this department.',
            'Cost center creation will happen automatically if code is new.',
            'Org chart will update immediately upon save.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}}
              style={{flex:1,padding:'14px',borderRadius:12,border:'none',
                background:T.gradient,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Create Department
            </button>
            <button onClick={onClose}
              style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',
                background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

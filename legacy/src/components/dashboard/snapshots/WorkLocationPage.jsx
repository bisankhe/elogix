// FILE: WorkLocationPage.jsx - Page 6: Work Location
import { useState } from 'react'
import { THEMES, Field, ContextMenu, ExcelModal, PageHeader, AIImpact, Drawer, SearchBar, Badge, LuxCard } from './DeptSetupShared.jsx'

const T = THEMES.work

const MOCK_LOCATIONS = [
  { id:'wl1', code:'WL-KTM-HQ', name:'Kathmandu Headquarters', short:'KTM HQ',
    type:'Primary Office', branch:'KTM-HQ', address:'Hattisar, Kathmandu 44600',
    country:'Nepal', province:'Bagmati', capacity:500, current_headcount:420,
    work_policy:'Office-First', shift_type:'Day Shift', shift_start:'09:00', shift_end:'18:00',
    latitude:27.7172, longitude:85.3240, map_url:'https://maps.google.com',
    amenities:['Parking','Cafeteria','Prayer Room','First Aid','Gym'],
    attendance_device:'Biometric (Face + Fingerprint)', labour_office:'Kathmandu Labour Office',
    status:'active', icon:'🏛️', color:'#8b5cf6', employees:420,
    impact_links:[{icon:'📅',module:'Attendance',desc:'Biometric attendance device syncs here'},{icon:'💰',module:'Payroll',desc:'Location-based tax rates'},{icon:'⚖️',module:'Labour Office',desc:'Kathmandu Province Labour zone'}],
  },
  { id:'wl2', code:'WL-PKR', name:'Pokhara Branch Office', short:'Pokhara',
    type:'Branch Office', branch:'PKR-BR', address:'Lakeside, Pokhara 33700',
    country:'Nepal', province:'Gandaki', capacity:150, current_headcount:145,
    work_policy:'Office-First', shift_type:'Day Shift', shift_start:'09:00', shift_end:'18:00',
    latitude:28.2096, longitude:83.9856, map_url:'',
    amenities:['Parking','Cafeteria'],
    attendance_device:'Biometric (Fingerprint)', labour_office:'Gandaki Province Labour Office',
    status:'active', icon:'🏢', color:'#0ea5e9', employees:145,
    impact_links:[{icon:'📅',module:'Attendance',desc:'Pokhara office device'},{icon:'⚖️',module:'Labour Office',desc:'Gandaki Province zone'}],
  },
  { id:'wl3', code:'WL-RMT-NP', name:'Remote - Nepal', short:'Remote NP',
    type:'Remote/Virtual', branch:'RMT-WFH', address:'Various - Nepal',
    country:'Nepal', province:'Multiple', capacity:999, current_headcount:180,
    work_policy:'Remote-First', shift_type:'Flexible', shift_start:'08:00', shift_end:'20:00',
    latitude:null, longitude:null, map_url:'',
    amenities:['Home Office Allowance','Internet Reimbursement'],
    attendance_device:'Mobile App (GPS Check-in)', labour_office:'Registered Work Location Deemed',
    status:'active', icon:'🏠', color:'#10b981', employees:180,
    impact_links:[{icon:'📅',module:'Attendance',desc:'Mobile GPS tracking'},{icon:'💰',module:'Home Office Allowance',desc:'Remote work benefit'},{icon:'🔐',module:'VPN Access',desc:'Mandatory for remote workers'}],
  },
  { id:'wl4', code:'WL-IND-DL', name:'Delhi, India Office', short:'Delhi',
    type:'International', branch:'IND-DL', address:'Connaught Place, New Delhi 110001',
    country:'India', province:'Delhi NCR', capacity:300, current_headcount:280,
    work_policy:'Hybrid', shift_type:'Day Shift', shift_start:'09:30', shift_end:'18:30',
    latitude:28.6315, longitude:77.2167, map_url:'',
    amenities:['Parking','Cafeteria','Gym'],
    attendance_device:'Biometric + Mobile', labour_office:'Delhi Labour Office',
    status:'active', icon:'🏬', color:'#f59e0b', employees:280,
    impact_links:[{icon:'📅',module:'Attendance',desc:'India timezone (IST +5:30)'},{icon:'⚖️',module:'EPFO',desc:'PF under Delhi EPFO office'},{icon:'💰',module:'India Payroll',desc:'Different tax structure'}],
  },
  { id:'wl5', code:'WL-FLD', name:'Field / Client Site', short:'Field',
    type:'Field Work', branch:'Various', address:'Client locations',
    country:'Various', province:'Various', capacity:50, current_headcount:38,
    work_policy:'Field-Based', shift_type:'Variable', shift_start:'Varies', shift_end:'Varies',
    latitude:null, longitude:null, map_url:'',
    amenities:['Travel Allowance','Per Diem','Mobile Data'],
    attendance_device:'Mobile App', labour_office:'Home Branch Labour Office',
    status:'active', icon:'🚗', color:'#ef4444', employees:38,
    impact_links:[{icon:'📅',module:'Attendance',desc:'Field check-in/out via mobile'},{icon:'💰',module:'Travel Claims',desc:'Per diem and travel reimbursement'}],
  },
]

const CONTEXT_ACTIONS = [
  {icon:'👁️',label:'View Details',        key:'view'},
  {icon:'✏️',label:'Edit Location',       key:'edit'},
  {icon:'📍',label:'View on Map',         key:'map'},
  {icon:'👥',label:'View Employees',      key:'employees'},
  {icon:'📅',label:'Attendance Rules',    key:'attendance'},
  {icon:'⚖️',label:'Labour Zone',         key:'labour'},
  {icon:'📤',label:'Export Excel',        key:'export'},
  {icon:'❄️',label:'Deactivate Location', key:'deactivate', danger:true},
]

const TYPE_ICONS = {
  'Primary Office':'🏛️', 'Branch Office':'🏢', 'Remote/Virtual':'🏠',
  'International':'🌏', 'Field Work':'🚗',
}

export default function WorkLocationPage() {
  const [locs,      setLocs]      = useState(MOCK_LOCATIONS)
  const [search,    setSearch]    = useState('')
  const [ctx,       setCtx]       = useState(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [selected,  setSelected]  = useState(null)

  const filtered = locs.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.code.toLowerCase().includes(search.toLowerCase())
  )

  const totalCap  = locs.reduce((s,l)=>s+(l.capacity<999?l.capacity:0),0)
  const totalEmp  = locs.reduce((s,l)=>s+l.current_headcount,0)
  const countries = new Set(locs.map(l=>l.country)).size

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader
        icon="📍" title="Work Location"
        breadcrumb="Organization Management > Department & Team Setup"
        gradient={T.gradient}
        stats={[
          {icon:'📍',label:'Locations',  value:locs.length},
          {icon:'👥',label:'Employees',  value:totalEmp.toLocaleString()},
          {icon:'🌐',label:'Countries',  value:countries},
          {icon:'🏢',label:'Capacity',   value:totalCap},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Location"
        onExcel={()=>setShowExcel(true)}
      />

      <SearchBar value={search} onChange={setSearch}
        placeholder="Search work locations..."
        extra={
          <div style={{display:'flex',gap:6}}>
            {['All','Nepal','India','Remote'].map(f=>(
              <button key={f}
                style={{padding:'8px 14px',borderRadius:20,border:'1.5px solid #e2e8f0',
                  background:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',color:'#64748b'}}
                onMouseEnter={e=>{e.target.style.borderColor='#8b5cf6';e.target.style.color='#8b5cf6'}}
                onMouseLeave={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.color='#64748b'}}>
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,
        padding:'8px 14px',marginBottom:16,fontSize:11,color:'#4c1d95'}}>
        Work locations determine: attendance device, shift policy, labour office zone, tax rates, and leave calendar.
        Right-click for full SAP impact analysis.
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
        {filtered.map(loc => {
          const utilPct = loc.capacity < 999
            ? Math.round(loc.current_headcount / loc.capacity * 100) : null
          return (
            <LuxCard key={loc.id} color={loc.color}
              onClick={()=>setSelected(loc)}
              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,item:loc})}}>
              <div style={{padding:'16px 16px 12px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:46,height:46,borderRadius:12,background:`${loc.color}18`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                  {loc.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{loc.name}</span>
                    <Badge status={loc.status}/>
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{loc.code} &bull; {loc.type} &bull; {loc.country}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:3}}>
                    {loc.work_policy} &bull; {loc.shift_start} - {loc.shift_end}
                  </div>
                </div>
              </div>
              {/* Occupancy */}
              {utilPct !== null && (
                <div style={{padding:'0 16px 10px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:4,color:'#64748b'}}>
                    <span>Occupancy</span>
                    <span style={{fontWeight:700,color:utilPct>90?'#ef4444':utilPct>75?'#f59e0b':'#10b981'}}>
                      {loc.current_headcount}/{loc.capacity}
                    </span>
                  </div>
                  <div style={{height:6,background:'#f1f5f9',borderRadius:6,overflow:'hidden'}}>
                    <div style={{width:`${Math.min(utilPct,100)}%`,height:'100%',borderRadius:6,
                      background:utilPct>90?'#ef4444':utilPct>75?'#f59e0b':'#8b5cf6',transition:'width .5s'}}/>
                  </div>
                </div>
              )}
              {/* Amenities */}
              <div style={{padding:'0 16px 10px',display:'flex',gap:4,flexWrap:'wrap'}}>
                {loc.amenities.slice(0,3).map((a,i)=>(
                  <span key={i} style={{background:`${loc.color}12`,color:loc.color,
                    fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{a}</span>
                ))}
                {loc.amenities.length > 3 && (
                  <span style={{fontSize:9,color:'#94a3b8',padding:'2px 6px'}}>
                    +{loc.amenities.length-3} more
                  </span>
                )}
              </div>
              <div style={{borderTop:'1px solid #f1f5f9',padding:'8px 16px',fontSize:10,color:'#94a3b8'}}>
                {loc.attendance_device}
              </div>
            </LuxCard>
          )
        })}
        <div onClick={()=>setShowAdd(true)}
          style={{border:'2px dashed #ddd6fe',borderRadius:16,minHeight:180,display:'flex',
            flexDirection:'column',alignItems:'center',justifyContent:'center',
            cursor:'pointer',color:'#94a3b8',gap:8,transition:'all .2s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#8b5cf6';e.currentTarget.style.color='#8b5cf6'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#ddd6fe';e.currentTarget.style.color='#94a3b8'}}>
          <span style={{fontSize:32}}>+</span>
          <span style={{fontSize:12,fontWeight:700}}>Add Work Location</span>
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item}
        impactLinks={ctx.item?.impact_links?.map(l=>l.module)}
        actions={CONTEXT_ACTIONS}
        onAction={(k,item)=>{
          if(k==='view') setSelected(item)
          if(k==='map' && item.latitude) window.open(`https://maps.google.com/?q=${item.latitude},${item.longitude}`)
        }}
        onClose={()=>setCtx(null)} />}
      {showExcel && <ExcelModal title="Work Location"
        columns={['WL Code','Name','Type','Branch','Address','Country','Province','Capacity','Work Policy','Shift Start','Shift End','Attendance Device']}
        onClose={()=>setShowExcel(false)} onImport={f=>alert('Processing: '+f.name)} />}
      {showAdd && <AddLocationModal T={T} onClose={()=>setShowAdd(false)}
        onSave={l=>setLocs(p=>[...p,{...l,id:'wl'+Date.now(),status:'active',icon:'📍',color:'#8b5cf6',current_headcount:0,amenities:[],impact_links:[]}])} />}
      <Drawer item={selected} gradient={T.gradient} onClose={()=>setSelected(null)}
        rows={[
          ['Code',              selected?.code],
          ['Type',              selected?.type],
          ['Branch',            selected?.branch],
          ['Address',           selected?.address],
          ['Country',           selected?.country],
          ['Province',          selected?.province],
          ['Work Policy',       selected?.work_policy],
          ['Shift',             selected ? `${selected.shift_start} - ${selected.shift_end}` : null],
          ['Attendance Device', selected?.attendance_device],
          ['Labour Office',     selected?.labour_office],
          ['Capacity',          selected?.capacity < 999 ? selected?.capacity : 'Unlimited'],
          ['Current Headcount', selected?.current_headcount],
          ['Amenities',         selected?.amenities?.join(', ')],
        ]}/>
    </div>
  )
}

function AddLocationModal({ T, onClose, onSave }) {
  const [f,setF] = useState({code:'',name:'',short:'',type:'Branch Office',branch:'',address:'',country:'Nepal',province:'',capacity:'',work_policy:'Office-First',shift_start:'09:00',shift_end:'18:00',attendance_device:'Biometric (Fingerprint)',labour_office:''})
  const s = k => v => setF(p=>({...p,[k]:v}))
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,width:680,maxHeight:'90vh',overflow:'auto',boxShadow:'0 40px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 28px',background:T.gradient,position:'sticky',top:0,zIndex:10}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>+ New Work Location</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:2}}>All fields support voice input via the mic button</div>
        </div>
        <div style={{padding:'24px 28px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <Field label="Location Code" value={f.code} onChange={s('code')} required accent={T.accent} hint="e.g. WL-BRT-001"/>
            <Field label="Location Name" value={f.name} onChange={s('name')} required accent={T.accent}/>
            <Field label="Type" type="select" value={f.type} onChange={s('type')} accent={T.accent}
              options={['Primary Office','Branch Office','Remote/Virtual','International','Field Work','Warehouse','Project Site']}/>
            <Field label="Linked Branch" type="select" value={f.branch} onChange={s('branch')} accent={T.accent}
              options={['KTM-HQ','PKR-BR','BRT-BR','IND-DL','RMT-WFH']}/>
            <Field label="Country" type="select" value={f.country} onChange={s('country')} accent={T.accent}
              options={['Nepal','India','United Kingdom','UAE','USA','Australia']}/>
            <Field label="Province / State" value={f.province} onChange={s('province')} accent={T.accent}/>
            <Field label="Capacity (persons)" type="number" value={f.capacity} onChange={s('capacity')} accent={T.accent}/>
            <Field label="Work Policy" type="select" value={f.work_policy} onChange={s('work_policy')} accent={T.accent}
              options={['Office-First','Remote-First','Hybrid','Field-Based','Flexible']}/>
            <Field label="Shift Start" type="time" value={f.shift_start} onChange={s('shift_start')} accent={T.accent}/>
            <Field label="Shift End" type="time" value={f.shift_end} onChange={s('shift_end')} accent={T.accent}/>
            <Field label="Attendance Device" type="select" value={f.attendance_device} onChange={s('attendance_device')} accent={T.accent}
              options={['Biometric (Face + Fingerprint)','Biometric (Fingerprint)','Mobile App (GPS)','Mobile App','Manual Register','Card Reader']}/>
            <Field label="Labour Office Zone" value={f.labour_office} onChange={s('labour_office')} accent={T.accent} hint="e.g. Bagmati Province Labour Office"/>
          </div>
          <Field label="Full Address" value={f.address} onChange={s('address')} accent={T.accent}/>
          <AIImpact color={T.accent} lines={[
            'Work location determines attendance policy, shift timings, and leave calendar (public holidays per province).',
            'Labour office zone maps this location to the relevant regional Labour Act jurisdiction.',
            'Attendance device type determines the sync method (API, serial port, or manual import).',
            'Nepal: Province-wise minimum wage rates differ. Location assignment triggers correct wage rule.',
          ]}/>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>{onSave(f);onClose()}}
              style={{flex:1,padding:'14px',borderRadius:12,border:'none',background:T.gradient,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Create Work Location
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
